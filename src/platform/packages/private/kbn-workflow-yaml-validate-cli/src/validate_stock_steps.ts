/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { builtInStepDefinitions } from '@kbn/workflows';
import type { ValidationIssue } from './types';

const STOCK_STEP_TYPES = new Set(builtInStepDefinitions.map(({ id }) => id));

const STOCK_CONNECTOR_PREFIXES = [
  'data.',
  'elasticsearch.',
  'kibana.',
  'github.',
  'slack2.',
  'google_drive.',
  'salesforce.',
  'ai.',
] as const;

/**
 * Step types owned by the Workflows platform. Package assets must stay within
 * this contract so installing a package never depends on a product plugin's
 * custom step registry.
 */
export const isStockWorkflowStepType = (type: string): boolean =>
  STOCK_STEP_TYPES.has(type) || STOCK_CONNECTOR_PREFIXES.some((prefix) => type.startsWith(prefix));

/** Elastic packages store installable workflows below kibana/workflow/. */
export const isPackageWorkflowPath = (file: string): boolean =>
  file
    .replaceAll('\\', '/')
    .split('/')
    .some((segment, index, segments) => segment === 'kibana' && segments[index + 1] === 'workflow');

interface StepLocation {
  step: Record<string, unknown>;
  path: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const collectSteps = (value: unknown, path: string, result: StepLocation[]): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (!isRecord(item)) return;
      result.push({ step: item, path: `${path}.${index}` });
      collectNestedSteps(item, `${path}.${index}`, result);
    });
  }
};

const collectNestedSteps = (
  step: Record<string, unknown>,
  path: string,
  result: StepLocation[]
): void => {
  collectSteps(step.steps, `${path}.steps`, result);
  collectSteps(step.else, `${path}.else`, result);

  const onFailure = step['on-failure'];
  if (isRecord(onFailure)) {
    collectSteps(onFailure.fallback, `${path}.on-failure.fallback`, result);
  }

  for (const containerKey of ['branches', 'cases'] as const) {
    const containers = step[containerKey];
    if (!Array.isArray(containers)) continue;
    containers.forEach((container, index) => {
      if (isRecord(container)) {
        collectSteps(container.steps, `${path}.${containerKey}.${index}.steps`, result);
      }
    });
  }
};

/** Validate that a package template only references platform-owned stock steps. */
export const validateStockWorkflowSteps = (body: Record<string, unknown>): ValidationIssue[] => {
  const locations: StepLocation[] = [];
  collectSteps(body.steps, 'steps', locations);

  return locations.flatMap(({ step, path }) => {
    const type = step.type;
    if (typeof type !== 'string' || isStockWorkflowStepType(type)) return [];
    return [
      {
        source: 'stock-step' as const,
        path: `${path}.type`,
        message: `packaged workflows may only use stock step types; "${type}" is registered by a product plugin`,
      },
    ];
  });
};
