/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';

export type WorkflowExecuteStepType = 'workflow.execute' | 'workflow.executeAsync';

export interface WorkflowCallSite {
  workflowId: string;
  stepName: string;
  stepType: WorkflowExecuteStepType;
  /** Static `with.inputs` map; undefined when the step passes no inputs. */
  inputs?: Readonly<Record<string, unknown>>;
  /** True when `with.inputs` is a single template expression that cannot be inspected statically. */
  isDynamicInputs: boolean;
  /**
   * True when an `on-failure: continue` on the step, an enclosing step or the workflow settings
   * keeps the caller running after this step fails.
   */
  continuesOnFailure: boolean;
  /** True when the step might not run: it has an `if`, or sits in a branch, loop or fallback. */
  isConditional: boolean;
}

export interface ContractField {
  name: string;
  /** JSON type, or a union such as `string | null`; undefined accepts any value. */
  type?: string;
  required: boolean;
  hasDefault: boolean;
  enumValues?: readonly unknown[];
  /** The field's JSON schema as declared, used to compare nested shapes and constraints. */
  schema?: JSONSchema7;
}

export type OutputsSource = 'declared' | 'inferred' | 'none';

export interface WorkflowContract {
  /** Disabled workflows fail every `workflow.execute` step that runs them. */
  enabled: boolean;
  /** Workflows saved with errors have no definition, and every step that runs them fails. */
  valid: boolean;
  inputs: Readonly<Record<string, ContractField>>;
  hasDeclaredInputs: boolean;
  /** The inputs JSON schema the run validates against; undefined when no inputs are declared. */
  inputsSchema?: JsonModelSchemaType;
  /** True when the inputs schema rejects inputs it doesn't declare (`additionalProperties: false`). */
  rejectsUnknownInputs: boolean;
  outputs: Readonly<Record<string, ContractField>>;
  outputsSource: OutputsSource;
  /** Declared outputs that no `workflow.output` step sets, so callers always get nothing for them. */
  unreturnedOutputs: readonly string[];
  /** Without a `workflow.output` step, callers get the output of the workflow's last step instead. */
  hasOutputStep: boolean;
  /** Names the `workflow.output` steps set; undefined when there are none or they are computed. */
  returnedOutputs?: readonly string[];
}

export type Severity = 'breaking' | 'warning' | 'info';

export type ContractChangeKind =
  | 'disabled'
  | 'invalid'
  | 'inputAdded'
  | 'inputRemoved'
  | 'inputBecameRequired'
  | 'inputBecameOptional'
  | 'inputTypeChanged'
  | 'inputAllowedValuesChanged'
  | 'inputSchemaChanged'
  | 'unknownInputsRejected'
  | 'outputAdded'
  | 'outputRemoved'
  | 'outputNoLongerReturned'
  /** No `workflow.output` step is left, so callers get the last step's output instead. */
  | 'outputStepRemoved'
  | 'outputTypeChanged'
  | 'outputSchemaChanged';

export interface ContractChange {
  kind: ContractChangeKind;
  field: string;
  severity: Severity;
  from?: string;
  to?: string;
  /** For `inputAdded`: whether the new input is required without a default. */
  required?: boolean;
}

export type ImpactIssueKind =
  | 'childNotFound'
  | 'childDisabled'
  | 'childInvalid'
  /** The called workflow fails every run: its step `from` runs `to`, which is broken. */
  | 'childFails'
  /** Every run fails: the called workflow always runs, and leads back to one already running. */
  | 'callCycle'
  | 'selfCall'
  | 'missingRequiredInput'
  | 'unknownInput'
  | 'inputTypeMismatch'
  | 'inputRendersAsText'
  | 'inputValueRejected'
  | 'inputTypeChanged'
  | 'inputAllowedValuesChanged'
  | 'inputSchemaChanged'
  | 'removedOutput'
  | 'unreturnedOutput'
  | 'undeclaredOutput'
  /** The output is no longer declared, but a `workflow.output` step still sets it. */
  | 'outputNoLongerDeclared'
  /** There is no `workflow.output` step, so the caller gets the last step's output instead. */
  | 'outputFromLastStep'
  | 'outputTypeChanged';

export interface ImpactIssue {
  kind: ImpactIssueKind;
  severity: Exclude<Severity, 'info'>;
  stepName: string;
  field: string;
  from?: string;
  to?: string;
  /** For `inputValueRejected`: what the run's validation reports about the value. */
  detail?: string;
  /** False when the saved version of the child already had this issue. */
  isNew: boolean;
}

export type RowStatus = 'ok' | 'breaking' | 'warning' | 'unknown';

export interface InputRow {
  name: string;
  value?: unknown;
  isProvided: boolean;
  isRequired: boolean;
  status: RowStatus;
  issueKind?: ImpactIssueKind;
}

export interface OutputRow {
  /** Output field the caller reads; empty string when it reads the whole output object. */
  field: string;
  status: RowStatus;
  issueKind?: ImpactIssueKind;
}

export interface CallSiteImpact {
  stepName: string;
  stepType: WorkflowExecuteStepType;
  isDynamicInputs: boolean;
  inputs: InputRow[];
  outputs: OutputRow[];
}

/** `alreadyBroken`: unaffected by the draft, but the saved version already makes it fail. */
export type ImpactStatus = 'breaking' | 'warning' | 'alreadyBroken' | 'unknown' | 'safe';

/**
 * How a workflow further up the chain is affected. `fails`: the step that runs `viaName` fails and
 * stops it. `missingOutput`: it keeps running, but reads output `field` of `viaName`, which will be
 * empty because it comes from the broken workflow.
 */
export type UpstreamEffect = 'fails' | 'missingOutput';

export interface UpstreamImpact {
  workflowId: string;
  workflowName: string;
  effect: UpstreamEffect;
  /** The workflow it runs, one level down the chain. */
  viaName: string;
  /** For `missingOutput`: the output of `viaName` it reads. */
  field?: string;
}

export interface DependentImpact {
  workflowId: string;
  workflowName: string;
  enabled: boolean;
  status: ImpactStatus;
  callSites: CallSiteImpact[];
  issues: ImpactIssue[];
  /** Enabled workflows further up the chain that fail or lose data because this one breaks. */
  upstream: UpstreamImpact[];
}

export interface CalledWorkflowImpact {
  workflowId: string;
  /** Undefined when no workflow with `workflowId` exists. */
  workflowName?: string;
  status: ImpactStatus;
  callSites: CallSiteImpact[];
  issues: ImpactIssue[];
  contract?: WorkflowContract;
}

export interface DependentsSummary {
  direct: number;
  /** Enabled direct callers only: a disabled caller doesn't run, so saving can't break a run of it. */
  breaking: number;
  warning: number;
  /** Distinct enabled indirect callers that fail or lose data because a direct caller breaks. */
  indirectBreaking: number;
}

export interface DependentsAnalysis {
  contractChanges: ContractChange[];
  dependents: DependentImpact[];
  summary: DependentsSummary;
}

/** A workflow listed by name, with the ID to link to it. */
export interface WorkflowReference {
  id: string;
  name: string;
}

/** What fails when some workflows stop running because they are turned off or deleted. */
export interface RemovalImpact {
  /** Enabled workflows with a step that runs one of the removed workflows, and so fails. */
  callers: WorkflowReference[];
  /** Distinct enabled workflows further up that fail or lose data because a caller fails. */
  indirect: number;
}

export interface WorkflowLookupItem {
  id: string;
  name: string;
  enabled: boolean;
  definition: unknown;
}
