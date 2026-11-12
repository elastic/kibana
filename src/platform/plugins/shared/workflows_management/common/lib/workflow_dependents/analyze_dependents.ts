/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertJsonSchemaToZodWithRefs } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { isDynamicValue, isRecord } from '@kbn/workflows-yaml';
import { isBreakingRun } from './api';
import {
  collectWorkflowCallSites,
  findOutputsPassingThrough,
  findOutputUsages,
  isTemplatedValue,
  isTextTemplate,
} from './find_call_sites';
import type {
  CalledWorkflowImpact,
  CallSiteImpact,
  ContractChange,
  ContractField,
  DependentImpact,
  DependentsAnalysis,
  ImpactIssue,
  ImpactIssueKind,
  ImpactStatus,
  InputRow,
  OutputRow,
  RemovalImpact,
  RowStatus,
  UpstreamImpact,
  WorkflowCallSite,
  WorkflowContract,
  WorkflowLookupItem,
} from './types';
import {
  diffWorkflowContracts,
  extractWorkflowContract,
  hasSchemaDetailChange,
  isFieldNarrowed,
  isTypeWithin,
  typesOverlap,
} from './workflow_contract';

/** How many levels of callers-of-callers the analysis follows; runs nest at most 10 deep by default. */
export const MAX_INDIRECT_DEPTH = 10;

type DraftIssue = Omit<ImpactIssue, 'isNew'>;

interface CallSiteEvaluation {
  impact: CallSiteImpact;
  issues: DraftIssue[];
}

/** What the calling workflow can tell about values while checking them statically. */
interface CallerScope {
  inputs: Readonly<Record<string, ContractField>>;
  consts: Readonly<Record<string, unknown>>;
}

// Kinds that fail the step before the called workflow starts, whatever the step type.
const PRE_RUN_FAILURES = new Set<ImpactIssueKind>([
  'childNotFound',
  'childDisabled',
  'childInvalid',
  'selfCall',
]);
// Kinds that fail the called workflow's input validation; only a step that waits for it fails too.
const INPUT_FAILURES = new Set<ImpactIssueKind>([
  'missingRequiredInput',
  'unknownInput',
  'inputTypeMismatch',
  'inputRendersAsText',
  'inputValueRejected',
]);
const OUTPUT_LOSSES = new Set<ImpactIssueKind>(['removedOutput', 'unreturnedOutput']);

// A breaking issue about the step as a whole rather than one of its inputs or outputs.
const stepIssue = (kind: ImpactIssueKind, stepName: string, field = ''): DraftIssue => ({
  kind,
  severity: 'breaking',
  stepName,
  field,
});

const appendTo = <Key, Item>(groups: Map<Key, Item[]>, key: Key, items: readonly Item[]): void => {
  groups.set(key, [...(groups.get(key) ?? []), ...items]);
};

const getValueType = (value: unknown): string => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
};

const getCallerScope = (definition: unknown): CallerScope => ({
  inputs: extractWorkflowContract(definition).inputs,
  consts: isRecord(definition) && isRecord(definition.consts) ? definition.consts : {},
});

const EXPRESSION_REFERENCE = /^\$\{\{\s*(inputs|consts)\.([A-Za-z_][\w-]*)\s*\}\}$/;

const parseReference = (value: unknown): { scope: string; name: string } | undefined => {
  const match = typeof value === 'string' ? EXPRESSION_REFERENCE.exec(value) : null;
  return match ? { scope: match[1], name: match[2] } : undefined;
};

// Replaces `${{ consts.name }}` references with the constant, which is known statically.
const resolveConsts = (value: unknown, consts: CallerScope['consts']): unknown => {
  const reference = parseReference(value);
  if (reference?.scope === 'consts' && reference.name in consts) {
    return consts[reference.name];
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveConsts(item, consts));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveConsts(item, consts)])
    );
  }
  return value;
};

const containsTemplate = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsTemplate);
  if (isRecord(value)) return Object.values(value).some(containsTemplate);
  return isTemplatedValue(value);
};

interface ValidationIssue {
  path: readonly PropertyKey[];
  code: string;
  message: string;
}

const getAtPath = (value: unknown, path: readonly PropertyKey[]): unknown =>
  path.reduce<unknown>(
    (node, key) =>
      isRecord(node) || Array.isArray(node)
        ? (node as Record<PropertyKey, unknown>)[key]
        : undefined,
    value
  );

// Keeps the validation issues that hold whatever the templates in the value render to.
const isCertainIssue = (issue: ValidationIssue, value: unknown): boolean => {
  const node = getAtPath(value, issue.path);
  if (isDynamicValue(node)) {
    return false;
  }
  if (isTextTemplate(node)) {
    // It renders to some string: only "expected a non-string" is certain.
    return issue.code === 'invalid_type';
  }
  if (Array.isArray(node) || isRecord(node)) {
    return issue.code === 'invalid_type' || !containsTemplate(node);
  }
  return true;
};

const validateAgainstField = (
  value: unknown,
  field: ContractField,
  contract: WorkflowContract
): ValidationIssue[] => {
  if (!field.schema || !contract.inputsSchema) {
    return [];
  }
  try {
    const result = convertJsonSchemaToZodWithRefs(field.schema, contract.inputsSchema).safeParse(
      value
    );
    return result.success ? [] : (result.error.issues as ValidationIssue[]);
  } catch {
    // Schemas the converter can't compile are not checked, the same as in the editor.
    return [];
  }
};

const describeIssue = ({ path, message }: ValidationIssue): string =>
  path.length > 0 ? `${path.map(String).join('.')}: ${message}` : message;

const checkReferencedInput = (
  stepName: string,
  name: string,
  callerField: ContractField | undefined,
  field: ContractField
): { issue?: DraftIssue; isUnknown: boolean } => {
  if (!callerField?.type) {
    return { isUnknown: true };
  }
  if (isTypeWithin(callerField.type, field.type)) {
    return { isUnknown: Boolean(field.enumValues) };
  }
  return {
    issue: {
      kind: 'inputTypeMismatch',
      severity: typesOverlap(callerField.type, field.type) ? 'warning' : 'breaking',
      stepName,
      field: name,
      from: callerField.type,
      to: field.type,
    },
    isUnknown: false,
  };
};

const checkInputValue = (
  stepName: string,
  name: string,
  rawValue: unknown,
  field: ContractField,
  contract: WorkflowContract,
  scope: CallerScope
): { issue?: DraftIssue; isUnknown: boolean } => {
  const reference = parseReference(rawValue);
  if (reference?.scope === 'inputs') {
    return checkReferencedInput(stepName, name, scope.inputs[reference.name], field);
  }
  const value = resolveConsts(rawValue, scope.consts);
  if (isTextTemplate(value)) {
    // Whatever it renders is a string, so only whether strings are accepted at all is certain.
    return typesOverlap('string', field.type)
      ? { isUnknown: true }
      : {
          issue: {
            kind: 'inputRendersAsText',
            severity: 'breaking',
            stepName,
            field: name,
            to: field.type,
          },
          isUnknown: false,
        };
  }
  if (!isDynamicValue(value) && !isTypeWithin(getValueType(value), field.type)) {
    return {
      issue: {
        kind: 'inputTypeMismatch',
        severity: 'breaking',
        stepName,
        field: name,
        from: getValueType(value),
        to: field.type,
      },
      isUnknown: false,
    };
  }
  const [firstIssue] = validateAgainstField(value, field, contract).filter((issue) =>
    isCertainIssue(issue, value)
  );
  if (!firstIssue) {
    return { isUnknown: containsTemplate(value) };
  }
  return {
    issue: {
      kind: 'inputValueRejected',
      severity: 'breaking',
      stepName,
      field: name,
      detail: describeIssue(firstIssue),
    },
    isUnknown: false,
  };
};

// A value computed while running can't be checked, so warn when the field now accepts less.
const getNarrowingWarning = (
  stepName: string,
  field: ContractField,
  previousField: ContractField | undefined
): DraftIssue | undefined => {
  if (!previousField) {
    return undefined;
  }
  if (!isTypeWithin(previousField.type, field.type)) {
    return {
      kind: 'inputTypeChanged',
      severity: 'warning',
      stepName,
      field: field.name,
      from: previousField.type,
      to: field.type,
    };
  }
  if (isFieldNarrowed(previousField, field)) {
    return { kind: 'inputAllowedValuesChanged', severity: 'warning', stepName, field: field.name };
  }
  return hasSchemaDetailChange(previousField, field)
    ? { kind: 'inputSchemaChanged', severity: 'warning', stepName, field: field.name }
    : undefined;
};

const toRowStatus = (issue?: DraftIssue): RowStatus => issue?.severity ?? 'ok';

const evaluateInputs = (
  callSite: WorkflowCallSite,
  contract: WorkflowContract,
  previousContract: WorkflowContract | undefined,
  scope: CallerScope
): { rows: InputRow[]; issues: DraftIssue[] } => {
  const rows: InputRow[] = [];
  const issues: DraftIssue[] = [];
  const { stepName } = callSite;

  if (callSite.isDynamicInputs) {
    return { rows, issues };
  }

  const provided = callSite.inputs ?? {};
  for (const [name, value] of Object.entries(provided)) {
    const field = contract.inputs[name];
    let issue: DraftIssue | undefined;
    if (!field) {
      if (contract.hasDeclaredInputs) {
        issue = {
          kind: 'unknownInput',
          severity: contract.rejectsUnknownInputs ? 'breaking' : 'warning',
          stepName,
          field: name,
        };
      }
    } else {
      const check = checkInputValue(stepName, name, value, field, contract, scope);
      issue =
        check.issue ??
        (check.isUnknown
          ? getNarrowingWarning(stepName, field, previousContract?.inputs[name])
          : undefined);
    }
    if (issue) issues.push(issue);
    rows.push({
      name,
      value,
      isProvided: true,
      isRequired: Boolean(field?.required),
      status: toRowStatus(issue),
      issueKind: issue?.kind,
    });
  }

  for (const field of Object.values(contract.inputs)) {
    if (!(field.name in provided) && field.required && !field.hasDefault) {
      const issue = stepIssue('missingRequiredInput', stepName, field.name);
      issues.push(issue);
      rows.push({
        name: field.name,
        isProvided: false,
        isRequired: true,
        status: 'breaking',
        issueKind: issue.kind,
      });
    }
  }

  return { rows, issues };
};

const evaluateOutputs = (
  callSite: WorkflowCallSite,
  parentDefinition: unknown,
  contract: WorkflowContract,
  previousContract: WorkflowContract | undefined
): { rows: OutputRow[]; issues: DraftIssue[] } => {
  const rows: OutputRow[] = [];
  const issues: DraftIssue[] = [];
  // Async calls only return an execution reference, never the child's output.
  if (callSite.stepType !== 'workflow.execute') {
    return { rows, issues };
  }
  const { stepName } = callSite;
  for (const { field, hasFallback } of findOutputUsages(parentDefinition, stepName)) {
    let issue: DraftIssue | undefined;
    const contractField = field ? contract.outputs[field] : undefined;
    // A `| default:` filter replaces a missing value, so the caller keeps working.
    const lossSeverity = hasFallback ? 'warning' : 'breaking';
    if (field && !contract.hasOutputStep) {
      // The caller gets whatever the child's last step returns, which may or may not hold `field`.
      issue = { kind: 'outputFromLastStep', severity: 'warning', stepName, field };
    } else if (field && contract.outputsSource === 'none') {
      issue = { kind: 'undeclaredOutput', severity: 'warning', stepName, field };
    } else if (field && !contractField) {
      issue = contract.returnedOutputs?.includes(field)
        ? { kind: 'outputNoLongerDeclared', severity: 'warning', stepName, field }
        : { kind: 'removedOutput', severity: lossSeverity, stepName, field };
    } else if (field && contract.unreturnedOutputs.includes(field)) {
      issue = { kind: 'unreturnedOutput', severity: lossSeverity, stepName, field };
    } else if (field && contractField) {
      const previousType = previousContract?.outputs[field]?.type;
      if (previousType && !isTypeWithin(contractField.type, previousType)) {
        issue = {
          kind: 'outputTypeChanged',
          severity: 'warning',
          stepName,
          field,
          from: previousType,
          to: contractField.type,
        };
      }
    }
    if (issue) issues.push(issue);
    rows.push({ field, status: toRowStatus(issue), issueKind: issue?.kind });
  }
  return { rows, issues };
};

const evaluateCallSite = (
  callSite: WorkflowCallSite,
  parentDefinition: unknown,
  contract: WorkflowContract,
  previousContract?: WorkflowContract
): CallSiteEvaluation => {
  // A workflow saved with errors has no contract to check against; describe the call with the
  // last known one.
  const checkedContract = !contract.valid && previousContract ? previousContract : contract;
  const scope = getCallerScope(parentDefinition);
  const inputs = evaluateInputs(callSite, checkedContract, previousContract, scope);
  const outputs = evaluateOutputs(callSite, parentDefinition, checkedContract, previousContract);
  const impact: CallSiteImpact = {
    stepName: callSite.stepName,
    stepType: callSite.stepType,
    isDynamicInputs: callSite.isDynamicInputs,
    inputs: inputs.rows,
    outputs: outputs.rows,
  };
  if (!contract.valid) {
    return { impact, issues: [stepIssue('childInvalid', callSite.stepName)] };
  }
  const disabledIssues = contract.enabled ? [] : [stepIssue('childDisabled', callSite.stepName)];
  return { impact, issues: [...disabledIssues, ...inputs.issues, ...outputs.issues] };
};

const issueKey = ({ kind, stepName, field }: DraftIssue): string =>
  `${kind}\u0000${stepName}\u0000${field}`;

/** An issue is new unless the saved version had it at the same or a worse severity. */
const isNewIssue = (
  issue: DraftIssue,
  savedSeverities: ReadonlyMap<string, ImpactIssue['severity']>
): boolean => {
  const savedSeverity = savedSeverities.get(issueKey(issue));
  return (
    savedSeverity === undefined || (issue.severity === 'breaking' && savedSeverity !== 'breaking')
  );
};

const getImpactStatus = (
  issues: ImpactIssue[],
  callSites: CallSiteImpact[],
  contractChanges: ContractChange[]
): ImpactStatus => {
  const newIssues = issues.filter(({ isNew }) => isNew);
  if (newIssues.some(({ severity }) => severity === 'breaking')) return 'breaking';
  if (newIssues.some(({ severity }) => severity === 'warning')) return 'warning';
  if (issues.some(({ severity }) => severity === 'breaking')) return 'alreadyBroken';
  const hasInputChanges = contractChanges.some(
    ({ kind, severity }) => kind.startsWith('input') && severity !== 'info'
  );
  if (hasInputChanges && callSites.some(({ isDynamicInputs }) => isDynamicInputs)) {
    return 'unknown';
  }
  return 'safe';
};

const STATUS_ORDER: Record<ImpactStatus, number> = {
  breaking: 0,
  warning: 1,
  alreadyBroken: 2,
  unknown: 3,
  safe: 4,
};

type SortableImpact = Pick<CalledWorkflowImpact, 'workflowId' | 'workflowName' | 'status'>;

// Worst status first, then by name.
const compareImpacts = (a: SortableImpact, b: SortableImpact): number =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
  (a.workflowName ?? a.workflowId).localeCompare(b.workflowName ?? b.workflowId);

const analyzeDependent = (
  parent: WorkflowLookupItem,
  callSites: WorkflowCallSite[],
  savedContract: WorkflowContract,
  draftContract: WorkflowContract,
  contractChanges: ContractChange[]
): Omit<DependentImpact, 'upstream'> => {
  const savedSeverities = new Map<string, ImpactIssue['severity']>();
  for (const callSite of callSites) {
    for (const issue of evaluateCallSite(callSite, parent.definition, savedContract).issues) {
      const key = issueKey(issue);
      if (savedSeverities.get(key) !== 'breaking') {
        savedSeverities.set(key, issue.severity);
      }
    }
  }
  const evaluations = callSites.map((callSite) =>
    evaluateCallSite(callSite, parent.definition, draftContract, savedContract)
  );
  const issues = evaluations.flatMap(({ issues: draftIssues }) =>
    draftIssues.map((issue) => ({ ...issue, isNew: isNewIssue(issue, savedSeverities) }))
  );
  const impacts = evaluations.map(({ impact }) => impact);
  return {
    workflowId: parent.id,
    workflowName: parent.name,
    enabled: parent.enabled,
    status: getImpactStatus(issues, impacts, contractChanges),
    callSites: impacts,
    issues,
  };
};

interface StepRead {
  stepName: string;
  /** Undefined when every output of the step is missing, because the step failed. */
  field?: string;
}

/** How a broken workflow affects whatever runs it: it fails, or its listed outputs come back empty. */
interface WorkflowEffect {
  fails: boolean;
  emptyOutputs: ReadonlySet<string>;
}

interface CallerEdge {
  parent: WorkflowLookupItem;
  callSites: WorkflowCallSite[];
}

const stepFails = (kind: ImpactIssueKind, callSite: WorkflowCallSite): boolean =>
  PRE_RUN_FAILURES.has(kind) ||
  (INPUT_FAILURES.has(kind) && callSite.stepType === 'workflow.execute');

const toEffect = (
  definition: unknown,
  fails: boolean,
  reads: readonly StepRead[]
): WorkflowEffect => ({
  fails,
  emptyOutputs: fails ? new Set() : findOutputsPassingThrough(definition, reads),
});

const getDirectCallerEffect = (
  parent: WorkflowLookupItem,
  callSites: readonly WorkflowCallSite[],
  issues: readonly ImpactIssue[]
): WorkflowEffect => {
  let fails = false;
  const reads: StepRead[] = [];
  for (const { kind, stepName, field, severity, isNew } of issues) {
    const callSite = callSites.find((site) => site.stepName === stepName);
    if (callSite && isNew && severity === 'breaking') {
      if (stepFails(kind, callSite)) {
        if (callSite.continuesOnFailure) {
          reads.push({ stepName });
        } else {
          fails = true;
        }
      } else if (OUTPUT_LOSSES.has(kind)) {
        reads.push({ stepName, field });
      }
    }
  }
  return toEffect(parent.definition, fails, reads);
};

// How a caller is affected by running a workflow with `effect`; undefined when it isn't.
const getCallerEffect = (
  { parent, callSites }: CallerEdge,
  effect: WorkflowEffect
): { effect: WorkflowEffect; field?: string } | undefined => {
  let fails = false;
  let firstField: string | undefined;
  const reads: StepRead[] = [];
  // Background runs report neither their failure nor their outputs to the caller.
  const waitingCallSites = callSites.filter(({ stepType }) => stepType === 'workflow.execute');
  for (const { stepName, continuesOnFailure: continues } of waitingCallSites) {
    if (effect.fails) {
      if (continues) {
        reads.push({ stepName });
      } else {
        fails = true;
      }
    } else {
      for (const usage of findOutputUsages(parent.definition, stepName)) {
        const isEmpty = usage.field
          ? effect.emptyOutputs.has(usage.field)
          : effect.emptyOutputs.size > 0;
        if (isEmpty && !usage.hasFallback) {
          reads.push({ stepName, field: usage.field || undefined });
          firstField ??= usage.field || [...effect.emptyOutputs][0];
        }
      }
    }
  }
  if (!fails && reads.length === 0) {
    return undefined;
  }
  return { effect: toEffect(parent.definition, fails, reads), field: firstField };
};

/** Follows a broken direct caller up the chain to the enabled workflows that fail or lose data. */
const propagateUpstream = (
  root: WorkflowLookupItem,
  rootEffect: WorkflowEffect,
  callerEdges: ReadonlyMap<string, readonly CallerEdge[]>,
  excludedIds: ReadonlySet<string>
): UpstreamImpact[] => {
  const result: UpstreamImpact[] = [];
  const visited = new Set<string>([...excludedIds, root.id]);
  let frontier: Array<{ workflow: WorkflowLookupItem; effect: WorkflowEffect }> = [
    { workflow: root, effect: rootEffect },
  ];
  for (let depth = 2; depth <= MAX_INDIRECT_DEPTH && frontier.length > 0; depth++) {
    const next: typeof frontier = [];
    for (const { workflow, effect } of frontier) {
      const edges = (callerEdges.get(workflow.id) ?? []).filter(({ parent }) => parent.enabled);
      for (const edge of edges) {
        // Checked per edge: a workflow reached twice in the same level is reported once.
        const callerEffect = visited.has(edge.parent.id)
          ? undefined
          : getCallerEffect(edge, effect);
        if (callerEffect) {
          visited.add(edge.parent.id);
          result.push({
            workflowId: edge.parent.id,
            workflowName: edge.parent.name,
            effect: callerEffect.effect.fails ? 'fails' : 'missingOutput',
            viaName: workflow.name,
            field: callerEffect.field,
          });
          if (callerEffect.effect.fails || callerEffect.effect.emptyOutputs.size > 0) {
            next.push({ workflow: edge.parent, effect: callerEffect.effect });
          }
        }
      }
    }
    frontier = next;
  }
  return result;
};

export interface DependentsIndex {
  childId: string;
  directCallers: readonly CallerEdge[];
  /** For each workflow, the workflows that run it and the steps they run it with. */
  callerEdges: ReadonlyMap<string, readonly CallerEdge[]>;
}

const groupCallSites = (definition: unknown): Map<string, WorkflowCallSite[]> => {
  const callSitesByChild = new Map<string, WorkflowCallSite[]>();
  for (const callSite of collectWorkflowCallSites(definition)) {
    appendTo(callSitesByChild, callSite.workflowId, [callSite]);
  }
  return callSitesByChild;
};

const buildCallerEdges = (
  workflows: readonly WorkflowLookupItem[]
): Map<string, readonly CallerEdge[]> => {
  const callerEdges = new Map<string, CallerEdge[]>();
  for (const workflow of workflows) {
    for (const [calleeId, callSites] of groupCallSites(workflow.definition)) {
      appendTo(callerEdges, calleeId, [{ parent: workflow, callSites }]);
    }
  }
  return callerEdges;
};

/** Indexes which workflows call `childId`, directly or through other workflows. */
export const buildDependentsIndex = (
  childId: string,
  workflows: readonly WorkflowLookupItem[]
): DependentsIndex => {
  const callerEdges = buildCallerEdges(workflows.filter(({ id }) => id !== childId));
  return { childId, directCallers: callerEdges.get(childId) ?? [], callerEdges };
};

export interface AnalyzeDependentsParams {
  index: DependentsIndex;
  savedDefinition: unknown;
  draftDefinition: unknown;
  /** False when saving the draft would store it invalid (and turned off), which fails every caller. */
  isDraftValid?: boolean;
}

/** Grades how the draft definition of a workflow affects each workflow that calls it. */
export const analyzeDependents = ({
  index,
  savedDefinition,
  draftDefinition,
  isDraftValid = true,
}: AnalyzeDependentsParams): DependentsAnalysis => {
  const savedContract = extractWorkflowContract(savedDefinition);
  const parsedDraftContract = extractWorkflowContract(
    draftDefinition === undefined ? savedDefinition : draftDefinition
  );
  const draftContract = isDraftValid
    ? parsedDraftContract
    : { ...parsedDraftContract, valid: false, enabled: false };
  const contractChanges = diffWorkflowContracts(savedContract, draftContract);
  const excludedIds = new Set([index.childId]);

  const dependents: DependentImpact[] = index.directCallers
    .map(({ parent, callSites }) => {
      const dependent = analyzeDependent(
        parent,
        callSites,
        savedContract,
        draftContract,
        contractChanges
      );
      const upstream = isBreakingRun(dependent)
        ? propagateUpstream(
            parent,
            getDirectCallerEffect(parent, callSites, dependent.issues),
            index.callerEdges,
            excludedIds
          )
        : [];
      return { ...dependent, upstream };
    })
    .sort(compareImpacts);

  const breakingDependents = dependents.filter(isBreakingRun);
  const breakingIds = new Set(breakingDependents.map(({ workflowId }) => workflowId));
  const indirectBreakingIds = new Set(
    breakingDependents
      .flatMap(({ upstream }) => upstream.map(({ workflowId }) => workflowId))
      .filter((id) => !breakingIds.has(id))
  );

  return {
    contractChanges,
    dependents,
    summary: {
      direct: dependents.length,
      breaking: breakingDependents.length,
      warning: dependents.filter(({ status, enabled }) => enabled && status === 'warning').length,
      indirectBreaking: indirectBreakingIds.size,
    },
  };
};

const toNewIssues = (issues: readonly DraftIssue[]): ImpactIssue[] =>
  issues.map((issue) => ({ ...issue, isNew: true }));

const stepIssues = (
  kind: ImpactIssueKind,
  callSites: readonly WorkflowCallSite[],
  field?: string
): ImpactIssue[] => toNewIssues(callSites.map(({ stepName }) => stepIssue(kind, stepName, field)));

const getContract = (workflow: WorkflowLookupItem): WorkflowContract => ({
  ...extractWorkflowContract(workflow.definition),
  enabled: workflow.enabled && isRecord(workflow.definition),
});

/** A step of a workflow that fails every run of it, and the issue that makes it fail. */
interface RunFailure {
  stepName: string;
  calledName: string;
  issue: DraftIssue;
}

const toChildFailsIssue = (stepName: string, failure: RunFailure): DraftIssue => ({
  ...stepIssue('childFails', stepName),
  from: failure.stepName,
  to: failure.calledName,
});

// The issue that makes `callSite` fail every time, if any. `called` is undefined when not found.
const getCallFailure = (
  callSite: WorkflowCallSite,
  caller: WorkflowLookupItem,
  calledId: string,
  called: WorkflowLookupItem | undefined,
  resolveFailure: (workflowId: string) => RunFailure | undefined
): DraftIssue | undefined => {
  const { stepName } = callSite;
  if (calledId === caller.id) {
    return stepIssue('selfCall', stepName);
  }
  if (!called) {
    // Callees outside the fetched set (for example, ones the user can't read) aren't judged.
    return undefined;
  }
  const failing = evaluateCallSite(callSite, caller.definition, getContract(called)).issues.find(
    ({ kind, severity }) => severity === 'breaking' && stepFails(kind, callSite)
  );
  if (failing) {
    return failing;
  }
  const downstream =
    callSite.stepType === 'workflow.execute' ? resolveFailure(calledId) : undefined;
  return downstream ? toChildFailsIssue(stepName, downstream) : undefined;
};

/**
 * Finds, for each of `workflows`, a step that makes every run of it fail: a waiting step that
 * runs a broken workflow, or one that runs a workflow that fails in turn.
 */
const findRunFailures = (
  workflows: ReadonlyMap<string, WorkflowLookupItem>
): Map<string, RunFailure | undefined> => {
  const failures = new Map<string, RunFailure | undefined>();
  const resolve = (workflowId: string, depth: number): RunFailure | undefined => {
    if (failures.has(workflowId)) {
      return failures.get(workflowId);
    }
    const workflow = workflows.get(workflowId);
    // Settle cycles and unknown workflows as "not failing" before descending.
    failures.set(workflowId, undefined);
    if (!workflow || depth > MAX_INDIRECT_DEPTH) {
      return undefined;
    }
    let failure: RunFailure | undefined;
    for (const [calledId, callSites] of groupCallSites(workflow.definition)) {
      const called = workflows.get(calledId);
      for (const callSite of callSites.filter(({ continuesOnFailure }) => !continuesOnFailure)) {
        if (!failure) {
          const issue = getCallFailure(callSite, workflow, calledId, called, (id) =>
            resolve(id, depth + 1)
          );
          failure = issue
            ? { stepName: callSite.stepName, calledName: called?.name ?? calledId, issue }
            : undefined;
        }
      }
    }
    failures.set(workflowId, failure);
    return failure;
  };
  for (const workflowId of workflows.keys()) {
    resolve(workflowId, 1);
  }
  return failures;
};

/** Lists what fails when `workflowIds` stop running (turned off or deleted), given their callers. */
export const analyzeRemovalImpact = (
  workflowIds: readonly string[],
  callers: readonly WorkflowLookupItem[]
): RemovalImpact => {
  const removedIds = new Set(workflowIds);
  const callerEdges = buildCallerEdges(callers.filter(({ id }) => !removedIds.has(id)));
  // One edge per enabled caller, with its steps that run any of the removed workflows.
  const edgesByCaller = new Map<string, CallerEdge>();
  for (const { parent, callSites } of workflowIds.flatMap((id) => callerEdges.get(id) ?? [])) {
    if (parent.enabled) {
      const previous = edgesByCaller.get(parent.id)?.callSites ?? [];
      edgesByCaller.set(parent.id, { parent, callSites: [...previous, ...callSites] });
    }
  }

  const indirectIds = new Set<string>();
  for (const { parent, callSites } of edgesByCaller.values()) {
    // Running a workflow that is off or gone fails the step, whether or not it waits.
    const fails = callSites.some(({ continuesOnFailure: continues }) => !continues);
    const reads = callSites.map(({ stepName }) => ({ stepName }));
    propagateUpstream(parent, toEffect(parent.definition, fails, reads), callerEdges, removedIds)
      .filter(({ workflowId }) => !edgesByCaller.has(workflowId))
      .forEach(({ workflowId }) => indirectIds.add(workflowId));
  }

  return {
    callers: [...edgesByCaller.values()]
      .map(({ parent: { id, name } }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    indirect: indirectIds.size,
  };
};

export interface AnalyzeCalledWorkflowsParams {
  /** The workflow whose calls are checked. */
  workflowId: string;
  definition: unknown;
  /** The workflows it runs, and the ones they run in turn, as far as they are known. */
  workflows: readonly WorkflowLookupItem[];
}

/**
 * Checks every workflow the given definition runs: whether it exists, is on, accepts the call,
 * and doesn't itself fail further down the chain.
 */
export const analyzeCalledWorkflows = ({
  workflowId: selfId,
  definition,
  workflows,
}: AnalyzeCalledWorkflowsParams): CalledWorkflowImpact[] => {
  const workflowsById = new Map(
    workflows.filter(({ id }) => id !== selfId).map((workflow) => [workflow.id, workflow])
  );
  const runFailures = findRunFailures(workflowsById);
  const selfName =
    isRecord(definition) && typeof definition.name === 'string' ? definition.name : selfId;

  return [...groupCallSites(definition).entries()]
    .map(([workflowId, callSites]): CalledWorkflowImpact => {
      if (workflowId === selfId) {
        const issues = stepIssues('selfCall', callSites);
        return { workflowId, workflowName: selfName, status: 'breaking', callSites: [], issues };
      }
      const child = workflowsById.get(workflowId);
      if (!child) {
        const issues = stepIssues('childNotFound', callSites, workflowId);
        return { workflowId, status: 'breaking', callSites: [], issues };
      }
      const contract = getContract(child);
      const evaluations = callSites.map((callSite) =>
        evaluateCallSite(callSite, definition, contract)
      );
      // A child that is off or invalid already fails the step; its own calls don't matter then.
      const downstream =
        contract.enabled && contract.valid ? runFailures.get(workflowId) : undefined;
      const downstreamIssues: DraftIssue[] = downstream
        ? callSites
            .filter(({ stepType }) => stepType === 'workflow.execute')
            .map(({ stepName }) => toChildFailsIssue(stepName, downstream))
        : [];
      const issues = toNewIssues([
        ...evaluations.flatMap(({ issues: callIssues }) => callIssues),
        ...downstreamIssues,
      ]);
      const impacts = evaluations.map(({ impact }) => impact);
      const isUnchecked = impacts.some(({ isDynamicInputs }) => isDynamicInputs);
      const status = getImpactStatus(issues, impacts, []);
      return {
        workflowId,
        workflowName: child.name,
        status: status === 'safe' && isUnchecked ? 'unknown' : status,
        callSites: impacts,
        issues,
        contract,
      };
    })
    .sort(compareImpacts);
};
