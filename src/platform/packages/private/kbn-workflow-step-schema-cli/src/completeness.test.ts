/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkCompleteness } from './completeness';

describe('checkCompleteness', () => {
  it('is complete when the schema is a superset of the registered ids', () => {
    const result = checkCompleteness({
      endpointStepIds: ['cases.createCase', 'contextEngine.addEntry'],
      endpointTriggerIds: ['cases.caseCreated'],
      schemaStepTypes: ['cases.createCase', 'contextEngine.addEntry', 'if', 'slack'],
      schemaTriggerTypes: ['cases.caseCreated', 'alert', 'manual'],
    });
    expect(result.complete).toBe(true);
    expect(result.missingSteps).toEqual([]);
    expect(result.missingTriggers).toEqual([]);
  });

  it('reports registered ids missing from the schema, sorted', () => {
    const result = checkCompleteness({
      endpointStepIds: ['z.step', 'a.step', 'present.step'],
      endpointTriggerIds: ['missing.trigger'],
      schemaStepTypes: ['present.step', 'if'],
      schemaTriggerTypes: ['alert'],
    });
    expect(result.complete).toBe(false);
    expect(result.missingSteps).toEqual(['a.step', 'z.step']);
    expect(result.missingTriggers).toEqual(['missing.trigger']);
  });

  it('does not flag schema-only extras (built-ins/connectors)', () => {
    const result = checkCompleteness({
      endpointStepIds: ['cases.createCase'],
      endpointTriggerIds: [],
      schemaStepTypes: ['cases.createCase', 'if', 'foreach', '.slack'],
      schemaTriggerTypes: ['alert', 'manual', 'scheduled'],
    });
    expect(result.complete).toBe(true);
  });
});
