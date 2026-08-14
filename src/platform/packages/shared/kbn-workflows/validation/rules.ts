/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The validator that produces a rule's diagnostics. Groups rules; not an identity.
 *
 * `yaml` covers diagnostics we do not author ourselves: the `yaml` parser and the
 * JSON Schema layer behind `monaco-yaml`.
 */
export type WorkflowValidationRuleOwner =
  | 'connector-id-validation'
  | 'deprecated-step-validation'
  | 'esql-validation'
  | 'graph-build-validation'
  | 'if-condition-validation'
  | 'json-schema-default-validation'
  | 'liquid-template-validation'
  | 'parallel-fan-out-validation'
  | 'parallel-mode-validation'
  | 'step-name-validation'
  | 'step-property-validation'
  | 'trigger-condition-validation'
  | 'trigger-validation'
  | 'variable-validation'
  | 'workflow-inputs-validation'
  | 'workflow-output-validation'
  | 'yaml';

/**
 * Every workflow validation rule, keyed by its stable rule ID.
 *
 * A rule ID is the machine-readable identity of a check. It is not translated and
 * does not change when the user-facing message is reworded, which is what makes it
 * safe to key quick fixes, telemetry, severity overrides, and error suppression off.
 *
 * `values` documents the interpolation parameters the rule's message needs. It is
 * declared here so message construction can be type-checked against the registry;
 * call sites are converted incrementally.
 *
 * `defaultSeverity` is the registry default. Severity is deliberately orthogonal to
 * rule identity, so an emitter may report the same rule at a different severity when
 * context calls for it.
 *
 * Adding a check means adding an entry here first: `WorkflowValidationRuleId` is
 * derived from these keys, so an unregistered rule ID does not compile.
 */
export interface WorkflowValidationRules {
  // -- yaml ---------------------------------------------------------------------
  /** The document is not parseable as YAML. */
  yamlSyntaxError: {
    owner: 'yaml';
    defaultSeverity: 'error';
    values: { reason: string };
  };
  /** The document parses but violates the workflow JSON Schema. */
  schemaViolation: {
    owner: 'yaml';
    defaultSeverity: 'error';
    values: { reason: string };
  };

  // -- step names ---------------------------------------------------------------
  /** Two or more steps share a name. */
  duplicateStepName: {
    owner: 'step-name-validation';
    defaultSeverity: 'error';
    values: { stepName: string; occurrences: number };
  };

  // -- graph --------------------------------------------------------------------
  /** The execution graph could not be built from the definition. */
  graphBuildError: {
    owner: 'graph-build-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };

  // -- variables ----------------------------------------------------------------
  /** A referenced variable does not exist in the current context. */
  undefinedVariable: {
    owner: 'variable-validation';
    defaultSeverity: 'error';
    values: {};
  };
  /** The variable may be fine, but the workflow schema is too broken to tell. */
  variableUncheckableInvalidSchema: {
    owner: 'variable-validation';
    defaultSeverity: 'warning';
    values: { key: string };
  };
  /** A foreach item whose element type is only known at runtime. */
  foreachItemRuntimeType: {
    owner: 'variable-validation';
    defaultSeverity: 'warning';
    values: { description: string };
  };
  /** The variable path is syntactically invalid. */
  invalidVariablePath: {
    owner: 'variable-validation';
    defaultSeverity: 'error';
    values: { key: string };
  };
  /** The variable path could not be parsed. */
  variablePathParseError: {
    owner: 'variable-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };
  /** The variable resolves, but not to something valid in this position. */
  invalidVariableReference: {
    owner: 'variable-validation';
    defaultSeverity: 'error';
    values: { propertyPath: string };
  };
  /** Inference could not determine the variable's type. */
  unknownVariableType: {
    owner: 'variable-validation';
    defaultSeverity: 'warning';
    values: { propertyPath: string };
  };
  /** The context schema needed to check this variable was unavailable. */
  contextSchemaUnavailable: {
    owner: 'variable-validation';
    defaultSeverity: 'error';
    values: {};
  };
  /** A `{% for %}` collection path that does not resolve to something iterable. */
  invalidCollectionPath: {
    owner: 'variable-validation';
    defaultSeverity: 'error';
    values: { collectionPath: string };
  };
  /** A foreach parameter that is not a usable collection. */
  invalidForeachParameter: {
    owner: 'variable-validation';
    defaultSeverity: 'warning';
    values: { reason: string };
  };
  /** The validation run itself failed, so nothing could be checked. */
  validationRunFailed: {
    owner: 'variable-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };
  /** The variable resolved cleanly. Carries hover information, not a problem. */
  variableResolved: {
    owner: 'variable-validation';
    defaultSeverity: 'info';
    values: { description: string };
  };

  // -- liquid templates ---------------------------------------------------------
  /** The Liquid template does not parse. */
  liquidSyntaxError: {
    owner: 'liquid-template-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };
  /** A diagnostic raised by the Liquid template checker. */
  liquidTemplateDiagnostic: {
    owner: 'liquid-template-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };
  /** The Liquid checker itself threw. */
  liquidUnexpectedError: {
    owner: 'liquid-template-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };

  // -- connectors ---------------------------------------------------------------
  /** The dynamic connector type list could not be loaded. */
  dynamicConnectorTypesUnavailable: {
    owner: 'connector-id-validation';
    defaultSeverity: 'error';
    values: {};
  };
  /** The referenced connector ID does not exist. */
  connectorNotFound: {
    owner: 'connector-id-validation';
    defaultSeverity: 'error';
    values: { displayName: string; id: string };
  };
  /** The connector ID resolved. Carries hover information, not a problem. */
  connectorResolved: {
    owner: 'connector-id-validation';
    defaultSeverity: 'info';
    values: { displayName: string; name: string };
  };

  // -- step properties ----------------------------------------------------------
  /** A step property failed its own validation. */
  invalidStepProperty: {
    owner: 'step-property-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };
  /** A step property resolved cleanly. */
  stepPropertyResolved: {
    owner: 'step-property-validation';
    defaultSeverity: 'info';
    values: {};
  };

  // -- workflow inputs ----------------------------------------------------------
  /** An input key the target workflow does not declare. */
  unknownInputKey: {
    owner: 'workflow-inputs-validation';
    defaultSeverity: 'warning';
    values: { inputName: string; workflowName: string };
  };
  /** An input value whose type does not match the declared input. */
  invalidInputType: {
    owner: 'workflow-inputs-validation';
    defaultSeverity: 'error';
    values: { inputName: string; expectedType: string; actualType: string };
  };
  /** A required input of the target workflow was not supplied. */
  missingRequiredInput: {
    owner: 'workflow-inputs-validation';
    defaultSeverity: 'error';
    values: { inputName: string; workflowName: string };
  };
  /** The referenced target workflow does not exist. */
  targetWorkflowNotFound: {
    owner: 'workflow-inputs-validation';
    defaultSeverity: 'error';
    values: { workflowId: string };
  };

  // -- workflow outputs ---------------------------------------------------------
  /** A workflow output declaration is invalid. */
  invalidWorkflowOutput: {
    owner: 'workflow-output-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };

  // -- if conditions ------------------------------------------------------------
  /** `=` used where `==` was meant. */
  invalidEqualityOperator: {
    owner: 'if-condition-validation';
    defaultSeverity: 'error';
    values: {};
  };
  /** An unsupported inequality operator. */
  invalidInequalityOperator: {
    owner: 'if-condition-validation';
    defaultSeverity: 'error';
    values: {};
  };
  /** Assignment used inside a condition. */
  invalidAssignmentOperator: {
    owner: 'if-condition-validation';
    defaultSeverity: 'error';
    values: {};
  };
  /** The condition is not parseable as KQL. */
  invalidIfConditionSyntax: {
    owner: 'if-condition-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };

  // -- trigger conditions -------------------------------------------------------
  /** A trigger condition failed validation. */
  invalidTriggerCondition: {
    owner: 'trigger-condition-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };

  /** A trigger does not match its registered trigger definition. */
  invalidTriggerDefinition: {
    owner: 'trigger-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };

  // -- json schema defaults -----------------------------------------------------
  /** A declared default value does not satisfy its own property schema. */
  invalidDefaultValue: {
    owner: 'json-schema-default-validation';
    defaultSeverity: 'error';
    values: { propertyName: string; reason: string };
  };

  // -- parallel -----------------------------------------------------------------
  /** A parallel step with no `concurrency` limit. */
  unboundedParallelFanOut: {
    owner: 'parallel-fan-out-validation';
    defaultSeverity: 'warning';
    values: { stepId: string };
  };
  /** A parallel step whose static list exceeds the default fan-out maximum. */
  parallelFanOutExceedsLimit: {
    owner: 'parallel-fan-out-validation';
    defaultSeverity: 'warning';
    values: { stepId: string; itemCount: number; maxFanOut: number };
  };
  /** An unsupported combination of parallel mode options. */
  invalidParallelMode: {
    owner: 'parallel-mode-validation';
    defaultSeverity: 'error';
    values: {};
  };

  // -- deprecations -------------------------------------------------------------
  /** The step type is deprecated. */
  deprecatedStepType: {
    owner: 'deprecated-step-validation';
    defaultSeverity: 'warning';
    values: { stepType: string };
  };

  // -- es|ql --------------------------------------------------------------------
  /** A diagnostic forwarded from the ES|QL validator. */
  esqlDiagnostic: {
    owner: 'esql-validation';
    defaultSeverity: 'error';
    values: { reason: string };
  };
}

/** The stable identity of a validation check. Never translated. */
export type WorkflowValidationRuleId = keyof WorkflowValidationRules;

/** The interpolation parameters a rule's message needs. */
export type WorkflowValidationRuleValues<K extends WorkflowValidationRuleId> =
  WorkflowValidationRules[K]['values'];

/**
 * Severities a rule may declare as its default. Derived from the registry rather than
 * imported, so this module stays a leaf that the diagnostic types can depend on.
 */
export type WorkflowValidationRuleSeverity =
  WorkflowValidationRules[WorkflowValidationRuleId]['defaultSeverity'];

interface WorkflowValidationRuleDefinition<K extends WorkflowValidationRuleId> {
  owner: WorkflowValidationRules[K]['owner'];
  defaultSeverity: WorkflowValidationRules[K]['defaultSeverity'];
}

/**
 * Runtime view of the registry. Mapped over `WorkflowValidationRuleId`, so omitting a
 * rule or misdeclaring its owner is a type error rather than a silent gap.
 */
export const WORKFLOW_VALIDATION_RULES: {
  [K in WorkflowValidationRuleId]: WorkflowValidationRuleDefinition<K>;
} = {
  yamlSyntaxError: { owner: 'yaml', defaultSeverity: 'error' },
  schemaViolation: { owner: 'yaml', defaultSeverity: 'error' },

  duplicateStepName: { owner: 'step-name-validation', defaultSeverity: 'error' },

  graphBuildError: { owner: 'graph-build-validation', defaultSeverity: 'error' },

  undefinedVariable: { owner: 'variable-validation', defaultSeverity: 'error' },
  variableUncheckableInvalidSchema: { owner: 'variable-validation', defaultSeverity: 'warning' },
  foreachItemRuntimeType: { owner: 'variable-validation', defaultSeverity: 'warning' },
  invalidVariablePath: { owner: 'variable-validation', defaultSeverity: 'error' },
  variablePathParseError: { owner: 'variable-validation', defaultSeverity: 'error' },
  invalidVariableReference: { owner: 'variable-validation', defaultSeverity: 'error' },
  unknownVariableType: { owner: 'variable-validation', defaultSeverity: 'warning' },
  contextSchemaUnavailable: { owner: 'variable-validation', defaultSeverity: 'error' },
  invalidCollectionPath: { owner: 'variable-validation', defaultSeverity: 'error' },
  invalidForeachParameter: { owner: 'variable-validation', defaultSeverity: 'warning' },
  validationRunFailed: { owner: 'variable-validation', defaultSeverity: 'error' },
  variableResolved: { owner: 'variable-validation', defaultSeverity: 'info' },

  liquidSyntaxError: { owner: 'liquid-template-validation', defaultSeverity: 'error' },
  liquidTemplateDiagnostic: { owner: 'liquid-template-validation', defaultSeverity: 'error' },
  liquidUnexpectedError: { owner: 'liquid-template-validation', defaultSeverity: 'error' },

  dynamicConnectorTypesUnavailable: {
    owner: 'connector-id-validation',
    defaultSeverity: 'error',
  },
  connectorNotFound: { owner: 'connector-id-validation', defaultSeverity: 'error' },
  connectorResolved: { owner: 'connector-id-validation', defaultSeverity: 'info' },

  invalidStepProperty: { owner: 'step-property-validation', defaultSeverity: 'error' },
  stepPropertyResolved: { owner: 'step-property-validation', defaultSeverity: 'info' },

  unknownInputKey: { owner: 'workflow-inputs-validation', defaultSeverity: 'warning' },
  invalidInputType: { owner: 'workflow-inputs-validation', defaultSeverity: 'error' },
  missingRequiredInput: { owner: 'workflow-inputs-validation', defaultSeverity: 'error' },
  targetWorkflowNotFound: { owner: 'workflow-inputs-validation', defaultSeverity: 'error' },

  invalidWorkflowOutput: { owner: 'workflow-output-validation', defaultSeverity: 'error' },

  invalidEqualityOperator: { owner: 'if-condition-validation', defaultSeverity: 'error' },
  invalidInequalityOperator: { owner: 'if-condition-validation', defaultSeverity: 'error' },
  invalidAssignmentOperator: { owner: 'if-condition-validation', defaultSeverity: 'error' },
  invalidIfConditionSyntax: { owner: 'if-condition-validation', defaultSeverity: 'error' },

  invalidTriggerCondition: { owner: 'trigger-condition-validation', defaultSeverity: 'error' },
  invalidTriggerDefinition: { owner: 'trigger-validation', defaultSeverity: 'error' },

  invalidDefaultValue: { owner: 'json-schema-default-validation', defaultSeverity: 'error' },

  unboundedParallelFanOut: { owner: 'parallel-fan-out-validation', defaultSeverity: 'warning' },
  parallelFanOutExceedsLimit: {
    owner: 'parallel-fan-out-validation',
    defaultSeverity: 'warning',
  },
  invalidParallelMode: { owner: 'parallel-mode-validation', defaultSeverity: 'error' },

  deprecatedStepType: { owner: 'deprecated-step-validation', defaultSeverity: 'warning' },

  esqlDiagnostic: { owner: 'esql-validation', defaultSeverity: 'error' },
};

/** Every registered rule ID, sorted. Stable ordering keeps the snapshot test readable. */
export const WORKFLOW_VALIDATION_RULE_IDS = (
  Object.keys(WORKFLOW_VALIDATION_RULES) as WorkflowValidationRuleId[]
).sort();

/** Narrow an arbitrary string to a registered rule ID. */
export function isWorkflowValidationRuleId(value: string): value is WorkflowValidationRuleId {
  return Object.hasOwn(WORKFLOW_VALIDATION_RULES, value);
}

/** The registry default severity for a rule. Emitters may report a different one. */
export function getDefaultSeverityForRule(
  ruleId: WorkflowValidationRuleId
): WorkflowValidationRuleSeverity {
  return WORKFLOW_VALIDATION_RULES[ruleId].defaultSeverity;
}

/** The validator that owns a rule. */
export function getOwnerForRule(ruleId: WorkflowValidationRuleId): WorkflowValidationRuleOwner {
  return WORKFLOW_VALIDATION_RULES[ruleId].owner;
}
