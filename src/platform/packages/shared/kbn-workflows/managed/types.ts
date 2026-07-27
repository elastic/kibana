/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ManagedWorkflowManagement {
  lifecycle: 'static' | 'dynamic';
  versionStrategy: 'auto' | 'on_adopt';
  enablement: 'enforced' | 'restorable';
}

export const MANAGED_WORKFLOW_SELECTORS = ['rule_action'] as const;
export const MANAGED_WORKFLOW_SOLUTIONS = ['security'] as const;

export type ManagedWorkflowSelector = (typeof MANAGED_WORKFLOW_SELECTORS)[number];
export type ManagedWorkflowSolution = (typeof MANAGED_WORKFLOW_SOLUTIONS)[number];
export type ManagedWorkflowSelectorVisibilityContext = `selector:${ManagedWorkflowSelector}`;
export type ManagedWorkflowSolutionVisibilityContext = `solution:${ManagedWorkflowSolution}`;
export type ManagedWorkflowVisibilityContext =
  | ManagedWorkflowSelectorVisibilityContext
  | ManagedWorkflowSolutionVisibilityContext;

export const getManagedWorkflowSelectorVisibilityContext = <
  TSelector extends ManagedWorkflowSelector
>(
  selector: TSelector
): `selector:${TSelector}` => `selector:${selector}`;

export const getManagedWorkflowSolutionVisibilityContext = <
  TSolution extends ManagedWorkflowSolution
>(
  solution: TSolution
): `solution:${TSolution}` => `solution:${solution}`;

export interface ManagedWorkflowVisibility {
  selectors?: readonly ManagedWorkflowSelector[];
  solutions?: readonly ManagedWorkflowSolution[];
}

export const getManagedWorkflowVisibilityContexts = (
  visibility: ManagedWorkflowVisibility | undefined
): ManagedWorkflowVisibilityContext[] => [
  ...(visibility?.selectors ?? []).map(getManagedWorkflowSelectorVisibilityContext),
  ...(visibility?.solutions ?? []).map(getManagedWorkflowSolutionVisibilityContext),
];

export interface ManagedWorkflowTemplateValues {
  [key: string]: unknown;
}

type ManagedWorkflowDefinitionSource<TValues extends ManagedWorkflowTemplateValues> =
  | {
      yaml: string;
      yamlTemplate?: never;
    }
  | {
      yaml?: never;
      yamlTemplate(values: TValues): string;
    };

export type ManagedWorkflowDefinition<
  TValues extends ManagedWorkflowTemplateValues = ManagedWorkflowTemplateValues
> = {
  id: string;
  pluginId: string;
  version: number;
  billable: boolean;
  visibility?: ManagedWorkflowVisibility;
  management: ManagedWorkflowManagement;
} & ManagedWorkflowDefinitionSource<TValues>;
