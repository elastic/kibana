/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getDefaultSeverityForRule,
  getOwnerForRule,
  isWorkflowValidationRuleId,
  WORKFLOW_VALIDATION_RULE_IDS,
  WORKFLOW_VALIDATION_RULES,
} from './rules';

describe('workflow validation rules registry', () => {
  // Rule IDs are a public identifier: they key quick fixes, telemetry, severity
  // overrides and error suppression. Renaming one is a breaking change, so this
  // snapshot exists to make it a deliberate, reviewed edit rather than a drive-by.
  it('has a stable set of rule IDs', () => {
    expect(WORKFLOW_VALIDATION_RULE_IDS).toMatchInlineSnapshot(`
      Array [
        "connectorNotFound",
        "connectorResolved",
        "contextSchemaUnavailable",
        "deprecatedStepType",
        "duplicateStepName",
        "dynamicConnectorTypesUnavailable",
        "esqlDiagnostic",
        "foreachItemRuntimeType",
        "graphBuildError",
        "invalidAssignmentOperator",
        "invalidCollectionPath",
        "invalidDefaultValue",
        "invalidEqualityOperator",
        "invalidForeachParameter",
        "invalidIfConditionSyntax",
        "invalidInequalityOperator",
        "invalidInputType",
        "invalidParallelMode",
        "invalidStepProperty",
        "invalidTriggerCondition",
        "invalidTriggerDefinition",
        "invalidVariablePath",
        "invalidVariableReference",
        "invalidWorkflowOutput",
        "liquidSyntaxError",
        "liquidTemplateDiagnostic",
        "liquidUnexpectedError",
        "missingRequiredInput",
        "parallelFanOutExceedsLimit",
        "schemaViolation",
        "stepPropertyResolved",
        "targetWorkflowNotFound",
        "unboundedParallelFanOut",
        "undefinedVariable",
        "unknownInputKey",
        "unknownVariableType",
        "validationRunFailed",
        "variablePathParseError",
        "variableResolved",
        "variableUncheckableInvalidSchema",
        "yamlSyntaxError",
      ]
    `);
  });

  it('uses camelCase rule IDs, matching the ES|QL validator convention', () => {
    for (const ruleId of WORKFLOW_VALIDATION_RULE_IDS) {
      expect(ruleId).toMatch(/^[a-z][a-zA-Z0-9]*$/);
    }
  });

  it('gives every rule an owner and a default severity', () => {
    for (const ruleId of WORKFLOW_VALIDATION_RULE_IDS) {
      const rule = WORKFLOW_VALIDATION_RULES[ruleId];
      expect(rule.owner).toEqual(expect.any(String));
      expect(['error', 'warning', 'info']).toContain(rule.defaultSeverity);
    }
  });

  describe('isWorkflowValidationRuleId', () => {
    it('accepts a registered rule ID', () => {
      expect(isWorkflowValidationRuleId('duplicateStepName')).toBe(true);
    });

    it('rejects an unregistered string', () => {
      expect(isWorkflowValidationRuleId('not-a-rule')).toBe(false);
      expect(isWorkflowValidationRuleId('')).toBe(false);
    });

    it('rejects inherited object properties', () => {
      expect(isWorkflowValidationRuleId('toString')).toBe(false);
      expect(isWorkflowValidationRuleId('constructor')).toBe(false);
    });
  });

  describe('lookup helpers', () => {
    it('returns the registered owner', () => {
      expect(getOwnerForRule('connectorNotFound')).toBe('connector-id-validation');
      expect(getOwnerForRule('yamlSyntaxError')).toBe('yaml');
    });

    it('returns the registered default severity', () => {
      expect(getDefaultSeverityForRule('duplicateStepName')).toBe('error');
      expect(getDefaultSeverityForRule('deprecatedStepType')).toBe('warning');
      expect(getDefaultSeverityForRule('connectorResolved')).toBe('info');
    });
  });
});
