/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type StepFieldPathMode = 'input' | 'output';

/**
 * YAML template prefix for a step data field (`steps.{id}.output`, `inputs`, `event`).
 * Undefined means the table should not offer copy-field-path.
 */
export function getStepFieldPathPrefix({
  stepId,
  stepType,
  mode,
  hasError = false,
}: {
  stepId: string;
  stepType?: string;
  mode: StepFieldPathMode;
  hasError?: boolean;
}): string | undefined {
  const isOverviewStep = stepType === '__overview';
  const isTriggerStep = stepType?.startsWith('trigger_') ?? false;
  const triggerType = isTriggerStep ? stepType?.replace('trigger_', '') : undefined;

  if (isOverviewStep) {
    return '';
  }

  if (!isTriggerStep) {
    if (mode !== 'output' || hasError) {
      return undefined;
    }
    return `steps.${stepId}.${mode}`;
  }

  if (mode === 'output') {
    return '';
  }

  if (triggerType === 'manual') {
    return 'inputs';
  }

  return 'event';
}
