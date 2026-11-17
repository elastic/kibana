/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type WorkflowExecuteStepType = 'workflow.execute' | 'workflow.executeAsync';

export interface WorkflowCallSite {
  workflowId: string;
  stepName: string;
  stepType: WorkflowExecuteStepType;
  /** Static `with.inputs` map; undefined when the step passes no inputs. */
  inputs?: Readonly<Record<string, unknown>>;
  /** True when `with.inputs` is a single template expression that cannot be inspected statically. */
  isDynamicInputs: boolean;
}

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
  /** Managed workflows can only be run by other managed workflows. */
  managed?: boolean;
}
