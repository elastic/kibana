/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Overview / trigger pseudo-steps have no engine log stream.
 */
export const isEngineStepLogsEligible = (
  stepType: string | undefined,
  stepId: string
): boolean => {
  if (!stepId || stepId === 'trigger' || stepId === '__overview' || stepId === 'Overview') {
    return false;
  }
  if (!stepType) {
    return true;
  }
  return stepType !== '__overview' && !stepType.startsWith('trigger_');
};
