/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { alwaysEndsInOutputStep, UNSUPPORTED_RUN } from '@kbn/workflows/graph';
import {
  buildFieldsZodValidator,
  convertJsonSchemaToZodWithRefs,
} from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  applyInputDefaults,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import { isDynamicValue, isRecord } from '@kbn/workflows-yaml';
import { isBreakingRun } from './api';
import {
  collectWorkflowCallSites,
  findOutputsPassingThrough,
  findOutputUsages,
  isTemplatedValue,
  isTextTemplate,
  mayLoseImplicitOutput,
} from './find_call_sites';
import type { StepOutputRead } from './find_call_sites';
import {
  failureEscapes,
  findAlwaysFailure,
  getCompletingOutputBlocks,
  type StepFailures,
} from './run_outcomes';
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
  UncheckedRun,
  UpstreamImpact,
  WorkflowCallSite,
  WorkflowContract,
  WorkflowLookupItem,
} from './types';
import {
  diffWorkflowContracts,
  extractInputFields,
  extractWorkflowContract,
  getOwn,
  hasConstraintsBeyondType,
  hasSchemaDetailChange,
  isFieldNarrowed,
  isTypeWithin,
  typesOverlap,
} from './workflow_contract';

/**
 * How many levels of callers-of-callers the analysis follows. Runs nest up to the configurable
 * `maxWorkflowDepth` (10 calls below the first workflow by default).
 */
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
  'childManaged',
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
  'defaultValueRejected',
]);
// Kinds where the called workflow starts but fails every run; again only a waiting step fails.
const CHILD_RUN_FAILURES = new Set<ImpactIssueKind>([
  'childFails',
  'callCycle',
  'outputValueRejected',
  'runEndsUnsuccessfully',
]);
// Child run failures that come from the called workflow's own end step, which callers keep naming.
const END_STEP_FAILURES = new Set<ImpactIssueKind>([
  'outputValueRejected',
  'runEndsUnsuccessfully',
]);
const OUTPUT_LOSSES = new Set<ImpactIssueKind>(['removedOutput', 'unreturnedOutput']);

// A breaking issue about the step as a whole rather than one of its inputs or outputs.
const stepIssue = (kind: ImpactIssueKind, stepName: string, field = ''): DraftIssue => ({
  kind,
  severity: 'breaking',
  stepName,
  field,
});

// The engine only finds a managed workflow, including every global one, for a managed caller.
const canRun = (
  caller: Pick<WorkflowLookupItem, 'managed'>,
  called: Pick<WorkflowLookupItem, 'managed'>
): boolean => caller.managed === true || called.managed !== true;

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
  inputs: extractInputFields(definition),
  consts: isRecord(definition) && isRecord(definition.consts) ? definition.consts : {},
});

const EXPRESSION_REFERENCE = /^\$\{\{\s*(inputs|consts)\.([A-Za-z_][\w-]*)\s*\}\}$/;

const parseReference = (value: unknown): { scope: string; name: string } | undefined => {
  const match = typeof value === 'string' ? EXPRESSION_REFERENCE.exec(value) : null;
  return match ? { scope: match[1], name: match[2] } : undefined;
};

// Replaces `${{ consts.name }}` references with the constant, which is known statically. A
// reference to a constant that doesn't exist renders to nothing.
const resolveConsts = (value: unknown, consts: CallerScope['consts']): unknown => {
  const reference = parseReference(value);
  if (reference?.scope === 'consts') {
    return getOwn(consts, reference.name);
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
  origin?: string;
}

const getAtPath = (value: unknown, path: readonly PropertyKey[]): unknown =>
  path.reduce<unknown>(
    (node, key) =>
      (isRecord(node) || Array.isArray(node)) && Object.hasOwn(node, key)
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
    // Templates render the items and values, never how many items or which keys there are.
    const isAboutShape =
      issue.code === 'invalid_type' ||
      issue.code === 'unrecognized_keys' ||
      ((issue.code === 'too_small' || issue.code === 'too_big') && issue.origin === 'array');
    return isAboutShape || !containsTemplate(node);
  }
  return true;
};

type Validator = ReturnType<typeof convertJsonSchemaToZodWithRefs>;
type FieldSchema = NonNullable<ContractField['schema']>;
type InputsSchema = NonNullable<WorkflowContract['inputsSchema']>;

// Validators by field schema, then by the inputs schema its refs resolve against; null for a
// schema the converter can't compile. Every caller's values are checked against the same ones.
const validatorCache = new WeakMap<FieldSchema, WeakMap<InputsSchema, Validator | null>>();

const getFieldValidator = (schema: FieldSchema, inputsSchema: InputsSchema): Validator | null => {
  let byRoot = validatorCache.get(schema);
  if (!byRoot) {
    byRoot = new WeakMap();
    validatorCache.set(schema, byRoot);
  }
  let validator = byRoot.get(inputsSchema);
  if (validator === undefined) {
    try {
      validator = convertJsonSchemaToZodWithRefs(schema, inputsSchema);
    } catch {
      // Schemas the converter can't compile are not checked, the same as in the editor.
      validator = null;
    }
    byRoot.set(inputsSchema, validator);
  }
  return validator;
};

const validateAgainstField = (
  value: unknown,
  field: ContractField,
  contract: WorkflowContract
): ValidationIssue[] => {
  if (!field.schema || !contract.inputsSchema) {
    return [];
  }
  const validator = getFieldValidator(field.schema, contract.inputsSchema);
  try {
    const result = validator?.safeParse(value);
    return !result || result.success ? [] : (result.error.issues as ValidationIssue[]);
  } catch {
    return [];
  }
};

// Runs fill in the defaults of the fields a sent object or list leaves out before validating it.
const withNestedDefaults = (name: string, value: unknown, contract: WorkflowContract): unknown => {
  if ((!isRecord(value) && !Array.isArray(value)) || !contract.inputsSchema) {
    return value;
  }
  try {
    return (
      getOwn(applyInputDefaults({ [name]: value }, contract.inputsSchema) ?? {}, name) ?? value
    );
  } catch {
    return value;
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
  // The caller can be run without its input, and then sends nothing, which fails a required input
  // without a default.
  const mayBeOmitted = !callerField.required && !callerField.hasDefault;
  const omissionFails = field.required && !field.hasDefault;
  if (isTypeWithin(callerField.type, field.type)) {
    if (mayBeOmitted && omissionFails) {
      return {
        issue: { kind: 'inputMayBeMissing', severity: 'warning', stepName, field: name },
        isUnknown: false,
      };
    }
    // The caller's own input only guarantees the type; anything stricter is checked while running.
    return { isUnknown: hasConstraintsBeyondType(field) };
  }
  const alwaysFails =
    !typesOverlap(callerField.type, field.type) && (!mayBeOmitted || omissionFails);
  return {
    issue: {
      kind: 'inputTypeMismatch',
      severity: alwaysFails ? 'breaking' : 'warning',
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
    return checkReferencedInput(stepName, name, getOwn(scope.inputs, reference.name), field);
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
  const filledValue = withNestedDefaults(name, value, contract);
  const [firstIssue] = validateAgainstField(filledValue, field, contract).filter((issue) =>
    isCertainIssue(issue, filledValue)
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

const checkOmittedInput = (
  stepName: string,
  field: ContractField,
  defaultValue: unknown,
  contract: WorkflowContract
): DraftIssue | undefined => {
  if (defaultValue === undefined) {
    return field.required ? stepIssue('missingRequiredInput', stepName, field.name) : undefined;
  }
  const [firstIssue] = validateAgainstField(defaultValue, field, contract).filter((issue) =>
    isCertainIssue(issue, defaultValue)
  );
  return firstIssue
    ? {
        ...stepIssue('defaultValueRejected', stepName, field.name),
        detail: describeIssue(firstIssue),
      }
    : undefined;
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

// A declared input, or an undeclared one when `additionalProperties` gives the schema it's checked against.
const getInputField = (
  contract: WorkflowContract | undefined,
  name: string
): ContractField | undefined => {
  const declared = contract && getOwn(contract.inputs, name);
  if (declared) {
    return declared;
  }
  return contract?.additionalInputs ? { ...contract.additionalInputs, name } : undefined;
};

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
  const defaults = contract.inputDefaults;
  for (const [name, value] of Object.entries(provided)) {
    const field = getInputField(contract, name);
    let issue: DraftIssue | undefined;
    if (!field) {
      if (contract.inputsSchema) {
        issue = {
          kind: 'unknownInput',
          severity: contract.rejectsUnknownInputs ? 'breaking' : 'warning',
          stepName,
          field: name,
        };
      }
    } else {
      // Runs fill in the default for a `null` value as they do for an omitted input.
      const resolved = resolveConsts(value, scope.consts);
      const defaultValue = getOwn(defaults, name);
      const isOmitted = resolved === undefined || (resolved === null && defaultValue !== undefined);
      const check = isOmitted
        ? { issue: checkOmittedInput(stepName, field, defaultValue, contract), isUnknown: false }
        : checkInputValue(stepName, name, value, field, contract, scope);
      issue =
        check.issue ??
        (check.isUnknown
          ? getNarrowingWarning(stepName, field, getInputField(previousContract, name))
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

  // Runs fill in defaults for omitted inputs, then validate them like the ones that were sent.
  for (const field of Object.values(contract.inputs)) {
    if (!Object.hasOwn(provided, field.name)) {
      const issue = checkOmittedInput(stepName, field, getOwn(defaults, field.name), contract);
      if (issue) {
        issues.push(issue);
        rows.push({
          name: field.name,
          isProvided: false,
          isRequired: field.required,
          status: 'breaking',
          issueKind: issue.kind,
        });
      }
    }
  }

  return { rows, issues };
};

const returnsOutput = (contract: WorkflowContract, field: string): boolean =>
  getOwn(contract.outputs, field) !== undefined ||
  contract.outputStepNames?.includes(field) === true;

// The saved version declared or set the output, and the draft neither declares nor sets it.
const stopsReturning = (
  field: string,
  contract: WorkflowContract,
  previousContract: WorkflowContract | undefined
): boolean =>
  previousContract !== undefined &&
  returnsOutput(previousContract, field) &&
  contract.outputStepNames !== undefined &&
  !returnsOutput(contract, field);

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
    const contractField = field ? getOwn(contract.outputs, field) : undefined;
    // A `| default:` filter replaces a missing value, so the caller keeps working.
    const lossSeverity = hasFallback ? 'warning' : 'breaking';
    if (field && !contract.alwaysReturnsOutput) {
      // The caller gets whatever the child's last step returns, which may or may not hold `field`,
      // unless the run ends in a `workflow.output` step, which no longer returns it.
      issue = stopsReturning(field, contract, previousContract)
        ? { kind: 'removedOutput', severity: lossSeverity, stepName, field }
        : { kind: 'outputFromLastStep', severity: 'warning', stepName, field };
    } else if (field && contract.outputsSource === 'none' && !contract.returnedOutputs) {
      // Nothing is declared and the returned outputs are computed, so `field` may be among them.
      issue = { kind: 'undeclaredOutput', severity: 'warning', stepName, field };
    } else if (field && !contractField) {
      issue = contract.returnedOutputs?.includes(field)
        ? { kind: 'outputNoLongerDeclared', severity: 'warning', stepName, field }
        : { kind: 'removedOutput', severity: lossSeverity, stepName, field };
    } else if (field && contract.unreturnedOutputs.includes(field)) {
      issue = { kind: 'unreturnedOutput', severity: lossSeverity, stepName, field };
    } else if (field && contractField) {
      const previousType = previousContract && getOwn(previousContract.outputs, field)?.type;
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
    ({ kind, severity }) =>
      (kind.startsWith('input') || kind === 'unknownInputsRejected') && severity !== 'info'
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

/** A step of a workflow that fails every run of it, and the issue that makes it fail. */
export interface RunFailure {
  stepName: string;
  /** The workflow the step runs, when the step fails because of that call. */
  calledName?: string;
  issue: DraftIssue;
}

// A run that fails because it nests a loop of runs keeps reporting the loop further up, and one
// that fails on its own end step keeps naming it.
const toChildFailsIssue = (stepName: string, failure: RunFailure): DraftIssue => {
  const { kind } = failure.issue;
  if (END_STEP_FAILURES.has(kind) && failure.calledName === undefined) {
    return { ...failure.issue, stepName, from: failure.stepName };
  }
  return {
    ...stepIssue(kind === 'callCycle' ? 'callCycle' : 'childFails', stepName),
    from: failure.stepName,
    to: failure.calledName,
  };
};

const getOutputs = (definition: unknown): unknown =>
  isRecord(definition) ? definition.outputs : undefined;

type OutputsValidator = ReturnType<typeof buildFieldsZodValidator>;

const outputsValidatorCache = new WeakMap<object, OutputsValidator | null>();

// The validator for declared `outputs`; null when none are declared or they can't be compiled.
const getOutputsValidator = (outputs: unknown): OutputsValidator | null => {
  if (typeof outputs !== 'object' || outputs === null) {
    return null;
  }
  let validator = outputsValidatorCache.get(outputs);
  if (validator === undefined) {
    const schema = normalizeFieldsToJsonSchema(outputs);
    try {
      validator =
        schema?.properties && Object.keys(schema.properties).length > 0
          ? buildFieldsZodValidator(schema)
          : null;
    } catch {
      // Schemas the converter can't compile are not checked, the same as in the editor.
      validator = null;
    }
    outputsValidatorCache.set(outputs, validator);
  }
  return validator;
};

/**
 * How a `workflow.output` step of `definition` (as compiled, so `workflow.fail` is one with status
 * `failed`) ends the run: as failed or cancelled, or with values its declared outputs reject.
 */
const getEndStepFailure =
  (definition: unknown): StepFailures<RunFailure>['endStepFailure'] =>
  (step) => {
    const stepName = typeof step.name === 'string' ? step.name : '';
    const { status = 'completed', with: values = {} } = step;
    if (status === 'failed' || status === 'cancelled') {
      return { stepName, issue: stepIssue('runEndsUnsuccessfully', stepName, status) };
    }
    if (status !== 'completed') {
      return 'mayFail';
    }
    const validator = getOutputsValidator(getOutputs(definition));
    if (!validator) {
      return undefined;
    }
    if (!isRecord(values)) {
      return 'mayFail';
    }
    let issues: ValidationIssue[];
    try {
      const result = validator.safeParse(values);
      issues = result.success ? [] : (result.error.issues as ValidationIssue[]);
    } catch {
      return 'mayFail';
    }
    const firstIssue = issues.find((issue) => isCertainIssue(issue, values));
    if (!firstIssue) {
      return issues.length > 0 ? 'mayFail' : undefined;
    }
    return {
      stepName,
      issue: {
        kind: 'outputValueRejected',
        severity: 'breaking',
        stepName,
        field: firstIssue.path.length > 0 ? String(firstIssue.path[0]) : '',
        detail: describeIssue(firstIssue),
      },
    };
  };

// A called workflow that is off or invalid already fails the step; its own calls don't matter then.
const getRunFailureIssues = (
  callSites: readonly WorkflowCallSite[],
  contract: WorkflowContract,
  failure: RunFailure | undefined
): DraftIssue[] =>
  failure && contract.enabled && contract.valid
    ? callSites
        .filter(({ stepType }) => stepType === 'workflow.execute')
        .map(({ stepName }) => toChildFailsIssue(stepName, failure))
    : [];

interface ContractVersion {
  contract: WorkflowContract;
  runFailure?: RunFailure;
  uncheckedRun?: UncheckedRun;
}

const analyzeDependent = (
  parent: WorkflowLookupItem,
  callSites: WorkflowCallSite[],
  saved: ContractVersion,
  draft: ContractVersion,
  contractChanges: ContractChange[],
  isChildManaged: boolean
): Omit<DependentImpact, 'upstream'> => {
  const savedSeverities = new Map<string, ImpactIssue['severity']>();
  const savedIssues = [
    ...callSites.flatMap(
      (callSite) => evaluateCallSite(callSite, parent.definition, saved.contract).issues
    ),
    ...getRunFailureIssues(callSites, saved.contract, saved.runFailure),
  ];
  for (const issue of savedIssues) {
    const key = issueKey(issue);
    if (savedSeverities.get(key) !== 'breaking') {
      savedSeverities.set(key, issue.severity);
    }
  }
  const evaluations = callSites.map((callSite) =>
    evaluateCallSite(callSite, parent.definition, draft.contract, saved.contract)
  );
  const draftIssues = [
    ...evaluations.flatMap(({ issues: callIssues }) => callIssues),
    ...getRunFailureIssues(callSites, draft.contract, draft.runFailure),
  ];
  const impacts = evaluations.map(({ impact }) => impact);
  const dependent = {
    workflowId: parent.id,
    workflowName: parent.name,
    enabled: parent.enabled,
    callSites: impacts,
  };
  if (!canRun(parent, { managed: isChildManaged })) {
    // The engine never finds the workflow for this caller, whichever version is saved.
    const issues = callSites.map(({ stepName }) => ({
      ...stepIssue('childManaged', stepName),
      isNew: false,
    }));
    return { ...dependent, status: 'alreadyBroken', issues };
  }
  const issues = draftIssues.map((issue) => ({
    ...issue,
    isNew: isNewIssue(issue, savedSeverities),
  }));
  const status = getImpactStatus(issues, impacts, contractChanges);
  // Only a run the step waits for can fail it.
  const uncheckedRun =
    status === 'safe' &&
    draft.contract.enabled &&
    draft.contract.valid &&
    callSites.some(({ stepType }) => stepType === 'workflow.execute')
      ? draft.uncheckedRun
      : undefined;
  return {
    ...dependent,
    status: uncheckedRun ? 'unknown' : status,
    issues,
    ...(uncheckedRun ? { uncheckedRun } : {}),
  };
};

/** How a broken workflow affects whatever runs it: it fails, or its listed outputs come back empty. */
interface WorkflowEffect {
  fails: boolean;
  emptyOutputs: ReadonlySet<string>;
  /** True when a run without a `workflow.output` step may return an empty output, of any field. */
  emptiesImplicitOutput: boolean;
}

interface CallerEdge {
  parent: WorkflowLookupItem;
  callSites: WorkflowCallSite[];
}

const stepFails = (kind: ImpactIssueKind, callSite: WorkflowCallSite): boolean =>
  PRE_RUN_FAILURES.has(kind) ||
  ((INPUT_FAILURES.has(kind) || CHILD_RUN_FAILURES.has(kind)) &&
    callSite.stepType === 'workflow.execute');

// A read with no `field` stands for every output of a step that failed.
const toEffect = (
  definition: unknown,
  fails: boolean,
  reads: readonly StepOutputRead[]
): WorkflowEffect => ({
  fails,
  emptyOutputs: fails
    ? new Set()
    : findOutputsPassingThrough(getCompletingOutputBlocks(definition), reads),
  emptiesImplicitOutput:
    !fails && !alwaysEndsInOutputStep(definition) && mayLoseImplicitOutput(definition, reads),
});

const losesOutputs = ({ emptyOutputs, emptiesImplicitOutput }: WorkflowEffect): boolean =>
  emptyOutputs.size > 0 || emptiesImplicitOutput;

// The steps of `definition` known to fail: the calls `callFails`, and its failing end steps.
const failingSteps = (
  definition: unknown,
  callFails: (callSite: WorkflowCallSite) => boolean
): StepFailures<unknown> => ({
  callFailure: (callSite) => callFails(callSite) || undefined,
  endStepFailure: getEndStepFailure(definition),
});

// Calls to the broken workflow fail when they are one of `failing`; other calls aren't known to.
const failsLike =
  (failing: readonly WorkflowCallSite[]) =>
  ({ workflowId, stepName }: WorkflowCallSite): boolean =>
    failing.some((site) => site.workflowId === workflowId && site.stepName === stepName);

const callFailureEscapes = (
  definition: unknown,
  { stepName }: WorkflowCallSite,
  callFails: (callSite: WorkflowCallSite) => boolean
): boolean => failureEscapes(definition, stepName, failingSteps(definition, callFails));

const getDirectCallerEffect = (
  parent: WorkflowLookupItem,
  callSites: readonly WorkflowCallSite[],
  issues: readonly ImpactIssue[]
): WorkflowEffect => {
  const failing: WorkflowCallSite[] = [];
  const reads: StepOutputRead[] = [];
  for (const { kind, stepName, field, severity, isNew } of issues) {
    const callSite = callSites.find((site) => site.stepName === stepName);
    if (callSite && isNew && severity === 'breaking') {
      if (stepFails(kind, callSite)) {
        failing.push(callSite);
      } else if (OUTPUT_LOSSES.has(kind)) {
        reads.push({ stepName, field });
      }
    }
  }
  const callFails = failsLike(failing);
  let fails = false;
  for (const callSite of failing) {
    if (callFailureEscapes(parent.definition, callSite, callFails)) {
      fails = true;
    } else {
      reads.push({ stepName: callSite.stepName });
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
  const reads: StepOutputRead[] = [];
  // Background runs report neither their failure nor their outputs to the caller.
  const waitingCallSites = callSites.filter(({ stepType }) => stepType === 'workflow.execute');
  const callFails = failsLike(waitingCallSites);
  for (const callSite of waitingCallSites) {
    const { stepName } = callSite;
    if (effect.fails) {
      if (callFailureEscapes(parent.definition, callSite, callFails)) {
        fails = true;
      } else {
        reads.push({ stepName });
      }
    } else {
      for (const usage of findOutputUsages(parent.definition, stepName)) {
        const isEmpty =
          effect.emptiesImplicitOutput ||
          (usage.field ? effect.emptyOutputs.has(usage.field) : effect.emptyOutputs.size > 0);
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

const mergeEffects = (first: WorkflowEffect, second: WorkflowEffect): WorkflowEffect => {
  const fails = first.fails || second.fails;
  return {
    fails,
    emptyOutputs: fails ? new Set() : new Set([...first.emptyOutputs, ...second.emptyOutputs]),
    emptiesImplicitOutput: !fails && (first.emptiesImplicitOutput || second.emptiesImplicitOutput),
  };
};

// Failing beats losing outputs, and losing more outputs beats losing fewer.
const isWorseEffect = (effect: WorkflowEffect, than: WorkflowEffect): boolean =>
  (effect.fails && !than.fails) ||
  (!effect.fails &&
    !than.fails &&
    (effect.emptyOutputs.size > than.emptyOutputs.size ||
      (effect.emptiesImplicitOutput && !than.emptiesImplicitOutput)));

/**
 * Follows a broken direct caller up the chain to the enabled workflows that fail or lose data.
 * A workflow reached through several paths gets the combined effect of all of them, and is
 * followed again whenever a later path makes its effect worse.
 */
const propagateUpstream = (
  root: WorkflowLookupItem,
  rootEffect: WorkflowEffect,
  callerEdges: ReadonlyMap<string, readonly CallerEdge[]>,
  excludedIds: ReadonlySet<string>
): UpstreamImpact[] => {
  const impacts = new Map<string, UpstreamImpact>();
  const effects = new Map<string, WorkflowEffect>();
  let frontier: Array<{ workflow: WorkflowLookupItem; effect: WorkflowEffect }> = [
    { workflow: root, effect: rootEffect },
  ];
  for (let depth = 2; depth <= MAX_INDIRECT_DEPTH && frontier.length > 0; depth++) {
    const next = new Map<string, { workflow: WorkflowLookupItem; effect: WorkflowEffect }>();
    for (const { workflow, effect } of frontier) {
      // A caller that can't run the workflow fails the same way before and after.
      const edges = (callerEdges.get(workflow.id) ?? []).filter(
        ({ parent }) =>
          parent.enabled &&
          parent.id !== root.id &&
          !excludedIds.has(parent.id) &&
          canRun(parent, workflow)
      );
      for (const edge of edges) {
        const callerEffect = getCallerEffect(edge, effect);
        const previous = effects.get(edge.parent.id);
        const merged =
          callerEffect && previous
            ? mergeEffects(previous, callerEffect.effect)
            : callerEffect?.effect;
        if (callerEffect && merged && (!previous || isWorseEffect(merged, previous))) {
          effects.set(edge.parent.id, merged);
          const previousImpact = impacts.get(edge.parent.id);
          const isNewCause = !previousImpact || (merged.fails && !previous?.fails);
          impacts.set(edge.parent.id, {
            workflowId: edge.parent.id,
            workflowName: edge.parent.name,
            effect: merged.fails ? 'fails' : 'missingOutput',
            viaName: isNewCause ? workflow.name : previousImpact.viaName,
            field: isNewCause ? callerEffect.field : previousImpact.field,
          });
          if (merged.fails || losesOutputs(merged)) {
            next.set(edge.parent.id, { workflow: edge.parent, effect: merged });
          }
        }
      }
    }
    frontier = [...next.values()];
  }
  return [...impacts.values()];
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
  /** The step that makes every run of the saved version fail, if any. */
  savedRunFailure?: RunFailure;
  /** The step that makes every run of the draft fail, if any. */
  draftRunFailure?: RunFailure;
  /** Why whether every run of the draft fails can't be checked, if it can't. */
  draftUncheckedRun?: UncheckedRun;
  /** Whether the workflow is managed, so that only managed workflows can run it. */
  managed?: boolean;
}

/** Grades how the draft definition of a workflow affects each workflow that calls it. */
export const analyzeDependents = ({
  index,
  savedDefinition,
  draftDefinition,
  isDraftValid = true,
  savedRunFailure,
  draftRunFailure,
  draftUncheckedRun,
  managed = false,
}: AnalyzeDependentsParams): DependentsAnalysis => {
  const savedContract = extractWorkflowContract(savedDefinition);
  // A draft saved invalid is stored without a definition, so nothing in it reaches callers.
  const draftContract = isDraftValid
    ? extractWorkflowContract(draftDefinition === undefined ? savedDefinition : draftDefinition)
    : { ...savedContract, valid: false, enabled: false };
  const contractChanges = diffWorkflowContracts(savedContract, draftContract);
  const excludedIds = new Set([index.childId]);

  const dependents: DependentImpact[] = index.directCallers
    .map(({ parent, callSites }) => {
      const dependent = analyzeDependent(
        parent,
        callSites,
        { contract: savedContract, runFailure: savedRunFailure },
        {
          contract: draftContract,
          runFailure: draftRunFailure,
          uncheckedRun: isDraftValid ? draftUncheckedRun : undefined,
        },
        contractChanges,
        managed
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
      unknown: dependents.filter(({ status, enabled }) => enabled && status === 'unknown').length,
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

// Returned for a called workflow that is already running further up (or taken to be, while
// finding the workflows that fail), so a call to it nests runs.
const IN_PROGRESS = 'inProgress';
type RunFailureResolution = RunFailure | typeof IN_PROGRESS | undefined;

// The issue that makes `callSite` fail every time, if any. `called` is undefined when not found.
const getCallFailure = (
  callSite: WorkflowCallSite,
  caller: WorkflowLookupItem,
  calledId: string,
  called: WorkflowLookupItem | undefined,
  resolveFailure: (workflowId: string) => RunFailureResolution
): DraftIssue | undefined => {
  const { stepName } = callSite;
  if (calledId === caller.id) {
    return stepIssue('selfCall', stepName);
  }
  if (!called) {
    // Callees outside the fetched set (for example, ones the user can't read) aren't judged.
    return undefined;
  }
  if (!canRun(caller, called)) {
    return { ...stepIssue('childManaged', stepName), to: called.name };
  }
  const failing = evaluateCallSite(callSite, caller.definition, getContract(called)).issues.find(
    ({ kind, severity }) => severity === 'breaking' && stepFails(kind, callSite)
  );
  if (failing) {
    return failing;
  }
  const downstream =
    callSite.stepType === 'workflow.execute' ? resolveFailure(calledId) : undefined;
  if (downstream === IN_PROGRESS) {
    // The called workflow is already running further up, so the runs nest until the depth limit.
    return { ...stepIssue('callCycle', stepName), to: called.name };
  }
  return downstream ? toChildFailsIssue(stepName, downstream) : undefined;
};

interface RunChecks {
  failures: Map<string, RunFailure>;
  /** For workflows not known to fail, why whether they do can't be checked. */
  unchecked: Map<string, UncheckedRun>;
}

const isRunFailure = (
  result: RunFailure | typeof UNSUPPORTED_RUN | undefined
): result is RunFailure => typeof result === 'object';

// For each workflow, the workflows in `workflows` that it runs.
const getCallers = (workflows: ReadonlyMap<string, WorkflowLookupItem>): Map<string, string[]> => {
  const callers = new Map<string, string[]>();
  for (const [callerId, { definition }] of workflows) {
    const calledIds = collectWorkflowCallSites(definition).map(({ workflowId }) => workflowId);
    for (const calledId of new Set(calledIds)) {
      callers.set(calledId, [...(callers.get(calledId) ?? []), callerId]);
    }
  }
  return callers;
};

// Visits each of `initial`. When a visit changes a workflow's result (`visit` returns true), the
// workflows that run it are visited again.
const runWorklist = (
  initial: Iterable<string>,
  callers: ReadonlyMap<string, readonly string[]>,
  visit: (workflowId: string) => boolean
): void => {
  const queue = [...initial];
  const queued = new Set(queue);
  for (let next = 0; next < queue.length; next++) {
    const workflowId = queue[next];
    queued.delete(workflowId);
    if (visit(workflowId)) {
      for (const callerId of callers.get(workflowId) ?? []) {
        if (!queued.has(callerId)) {
          queued.add(callerId);
          queue.push(callerId);
        }
      }
    }
  }
};

const isSameCall = (a: WorkflowCallSite, b: WorkflowCallSite): boolean =>
  a.workflowId === b.workflowId && a.stepName === b.stepName;

/**
 * Finds, for each of `workflows`, the failure that every run of it reaches first, when every run
 * fails: no path through it completes, given the calls that fail (a waiting call to a broken
 * workflow, or to one that fails every run in turn) and its `workflow.output` steps. Calls to
 * workflows outside `workflows` can't be checked, since a deleted workflow and one the user can't
 * read look the same.
 */
const findRunFailures = (workflows: ReadonlyMap<string, WorkflowLookupItem>): RunChecks => {
  // `resolveFailure` tells whether a called workflow fails every run; `alsoFails` adds calls that
  // are taken to fail.
  const findFailure = (
    workflow: WorkflowLookupItem,
    resolveFailure: (workflowId: string) => RunFailureResolution,
    alsoFails: (callSite: WorkflowCallSite) => boolean = () => false
  ): RunFailure | typeof UNSUPPORTED_RUN | undefined =>
    findAlwaysFailure(workflow.definition, {
      callFailure: (callSite) => {
        const { workflowId: calledId, stepName } = callSite;
        const called = workflows.get(calledId);
        const issue =
          getCallFailure(callSite, workflow, calledId, called, resolveFailure) ??
          (alsoFails(callSite) ? stepIssue('childFails', stepName) : undefined);
        return issue && { stepName, calledName: called?.name ?? calledId, issue };
      },
      endStepFailure: getEndStepFailure(workflow.definition),
    });

  const getWorkflow = (workflowId: string) => workflows.get(workflowId) as WorkflowLookupItem;
  const callers = getCallers(workflows);

  // Starting from all of them, drop the workflows that might complete, until the rest each fail
  // every run given that the others do. A run that keeps calling them fails, or nests runs until
  // the depth limit fails it. Dropping one can only drop the workflows that run it.
  const failing = new Set(workflows.keys());
  const assumeFailing = (workflowId: string): RunFailureResolution =>
    failing.has(workflowId) ? IN_PROGRESS : undefined;
  runWorklist(workflows.keys(), callers, (workflowId) => {
    if (
      !failing.has(workflowId) ||
      isRunFailure(findFailure(getWorkflow(workflowId), assumeFailing))
    ) {
      return false;
    }
    failing.delete(workflowId);
    return true;
  });

  // Explains each failure after those of the failing workflows it waits for, depth first: a call
  // to a workflow that is running further up is a loop of nested runs. An explicit stack keeps
  // long chains of calls off the call stack.
  const failures = new Map<string, RunFailure>();
  const onStack = new Set<string>();
  const resolve = (workflowId: string): RunFailureResolution =>
    onStack.has(workflowId) ? IN_PROGRESS : failures.get(workflowId);
  const getFailingCallees = (workflowId: string): string[] => [
    ...new Set(
      collectWorkflowCallSites(getWorkflow(workflowId).definition)
        .filter(
          ({ stepType, workflowId: calledId }) =>
            stepType === 'workflow.execute' && failing.has(calledId)
        )
        .map(({ workflowId: calledId }) => calledId)
    ),
  ];
  for (const rootId of failing) {
    const stack = failures.has(rootId)
      ? []
      : [{ workflowId: rootId, callees: getFailingCallees(rootId) }];
    stack.forEach(({ workflowId }) => onStack.add(workflowId));
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const calledId = frame.callees.pop();
      if (calledId === undefined) {
        const failure = findFailure(getWorkflow(frame.workflowId), resolve);
        if (isRunFailure(failure)) {
          failures.set(frame.workflowId, failure);
        }
        onStack.delete(frame.workflowId);
        stack.pop();
      } else if (!failures.has(calledId) && !onStack.has(calledId)) {
        onStack.add(calledId);
        stack.push({ workflowId: calledId, callees: getFailingCallees(calledId) });
      }
    }
  }

  // A workflow that might complete can't be checked when a run might reach steps the analysis
  // doesn't follow, or when it would fail every run if a call it makes to a workflow that can't be
  // checked failed. That makes the workflows that run it in turn worth checking again.
  const unchecked = new Map<string, UncheckedRun>();
  const findUncheckedCall = (workflowId: string): UncheckedRun | undefined => {
    const workflow = getWorkflow(workflowId);
    for (const callSite of collectWorkflowCallSites(workflow.definition)) {
      const { workflowId: calledId, stepName, stepType } = callSite;
      const isFound = workflows.has(calledId);
      const isUnchecked = isFound
        ? stepType === 'workflow.execute' && unchecked.has(calledId)
        : calledId !== workflowId;
      if (
        isUnchecked &&
        isRunFailure(findFailure(workflow, resolve, (site) => isSameCall(site, callSite)))
      ) {
        return {
          reason: isFound ? 'calledUnchecked' : 'calledNotFound',
          from: stepName,
          to: workflows.get(calledId)?.name ?? calledId,
        };
      }
    }
    return undefined;
  };
  runWorklist(workflows.keys(), callers, (workflowId) => {
    if (failing.has(workflowId) || unchecked.has(workflowId)) {
      return false;
    }
    const uncheckedRun =
      findFailure(getWorkflow(workflowId), resolve) === UNSUPPORTED_RUN
        ? { reason: 'unsupportedSteps' as const }
        : findUncheckedCall(workflowId);
    if (!uncheckedRun) {
      return false;
    }
    unchecked.set(workflowId, uncheckedRun);
    return true;
  });
  return { failures, unchecked };
};

/** What the analysis can tell about every run of a workflow. */
export interface RunCheck {
  /** The step that makes every run fail, if one does. */
  failure?: RunFailure;
  /** Why whether every run fails can't be checked, if it can't. */
  unchecked?: UncheckedRun;
}

/** Checks whether every run of `workflow` fails, given the workflows it runs down the chain. */
export const checkRun = (
  workflow: WorkflowLookupItem,
  calledWorkflows: readonly WorkflowLookupItem[]
): RunCheck => {
  const { failures, unchecked } = findRunFailures(
    new Map(
      [...calledWorkflows.filter(({ id }) => id !== workflow.id), workflow].map((item) => [
        item.id,
        item,
      ])
    )
  );
  const failure = failures.get(workflow.id);
  const uncheckedRun = unchecked.get(workflow.id);
  return {
    ...(failure ? { failure } : {}),
    ...(uncheckedRun ? { unchecked: uncheckedRun } : {}),
  };
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
    const callFails = ({ workflowId }: WorkflowCallSite) => removedIds.has(workflowId);
    const fails = callSites.some((callSite) =>
      callFailureEscapes(parent.definition, callSite, callFails)
    );
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
  /** The workflows it runs, and the ones they run in turn, as far as the user can read them. */
  workflows: readonly WorkflowLookupItem[];
  /** Whether the checked workflow is managed, which lets it run managed workflows. */
  managed?: boolean;
}

/**
 * Checks every workflow the given definition runs: whether it exists, is on, accepts the call,
 * and doesn't itself fail further down the chain.
 */
export const analyzeCalledWorkflows = ({
  workflowId: selfId,
  definition,
  workflows,
  managed = false,
}: AnalyzeCalledWorkflowsParams): CalledWorkflowImpact[] => {
  const selfName =
    isRecord(definition) && typeof definition.name === 'string' ? definition.name : selfId;
  // The draft stands in for the saved version, so calls that lead back to it are judged by it.
  const self: WorkflowLookupItem = {
    id: selfId,
    name: selfName,
    enabled: isRecord(definition) && definition.enabled !== false,
    definition,
    managed,
  };
  const workflowsById = new Map(
    [...workflows.filter(({ id }) => id !== selfId), self].map((workflow) => [
      workflow.id,
      workflow,
    ])
  );
  const { failures: runFailures, unchecked } = findRunFailures(workflowsById);

  return [...groupCallSites(definition).entries()]
    .map(([workflowId, callSites]): CalledWorkflowImpact => {
      if (workflowId === selfId) {
        const issues = stepIssues('selfCall', callSites);
        return { workflowId, workflowName: selfName, status: 'breaking', callSites: [], issues };
      }
      const child = workflowsById.get(workflowId);
      // `workflows` only holds what the user can read, so a workflow missing from it may still run.
      if (!child) {
        const issues = stepIssues('childNotFound', callSites, workflowId).map((issue) => ({
          ...issue,
          severity: 'warning' as const,
        }));
        return { workflowId, status: 'unknown', callSites: [], issues };
      }
      if (!canRun(self, child)) {
        const issues = stepIssues('childManaged', callSites);
        return { workflowId, workflowName: child.name, status: 'breaking', callSites: [], issues };
      }
      const contract = getContract(child);
      const evaluations = callSites.map((callSite) =>
        evaluateCallSite(callSite, definition, contract)
      );
      const issues = toNewIssues([
        ...evaluations.flatMap(({ issues: callIssues }) => callIssues),
        ...getRunFailureIssues(callSites, contract, runFailures.get(workflowId)),
      ]);
      const impacts = evaluations.map(({ impact }) => impact);
      const isUnchecked = impacts.some(({ isDynamicInputs }) => isDynamicInputs);
      // Only a run the step waits for can fail it.
      const uncheckedRun =
        contract.enabled &&
        contract.valid &&
        callSites.some(({ stepType }) => stepType === 'workflow.execute')
          ? unchecked.get(workflowId)
          : undefined;
      const status = getImpactStatus(issues, impacts, []);
      return {
        workflowId,
        workflowName: child.name,
        status: status === 'safe' && (isUnchecked || uncheckedRun) ? 'unknown' : status,
        callSites: impacts,
        issues,
        contract,
        ...(status === 'safe' && uncheckedRun ? { uncheckedRun } : {}),
      };
    })
    .sort(compareImpacts);
};
