/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Errors
export {
  InvalidYamlSchemaError,
  InvalidYamlSyntaxError,
  WorkflowValidationError,
  WorkflowConflictError,
  isWorkflowValidationError,
  isWorkflowConflictError,
} from './common/errors';

// Regex patterns and predicates
export {
  VARIABLE_REGEX_GLOBAL,
  PROPERTY_PATH_REGEX,
  LIQUID_BLOCK_START_REGEX,
  LIQUID_BLOCK_END_REGEX,
  isDynamicValue,
  isVariableValue,
  isLiquidTagValue,
} from './common/regex';

// JSON Schema template-tolerance weaver
export {
  buildTemplateTolerantJsonSchema,
  wholeValueStringAlternative,
  TEMPLATE_VALUE_DEF_NAME,
} from './common/json_schema/build_template_tolerant_json_schema';
export { validateLiquidTemplate } from './common/liquid/validate_liquid_template';
export { updateYamlField } from './common/yaml/update_yaml_field';
export {
  buildWorkflowLookup,
  inspectStep,
  getValueFromValueNode,
  NESTED_STEP_KEYS,
  isNestedStepKey,
  type NestedStepKey,
  type StepInfo,
  type StepPropInfo,
  type WorkflowLookup,
} from './common/yaml/build_workflow_lookup';
export { stringifyWorkflowDefinition } from './common/yaml/stringify_workflow_definition';
export { parseWorkflowYamlToJSON } from './common/yaml/parse_workflow_yaml_to_json';
export { parseYamlToJSONWithoutValidation } from './common/yaml/parse_workflow_yaml_to_json_without_validation';
export { parseWorkflowYamlForAutocomplete } from './common/yaml/parse_workflow_yaml_for_autocomplete';
export {
  parseLineForCompletion,
  isVariableLineParseResult,
} from './common/yaml/parse_line_for_completion';
export { getStepNodesWithType, isStepLikeMap } from './common/yaml/get_step_nodes_with_type';
export { getScalarValueAtOffset } from './common/yaml/get_scalar_value_at_offset';
export { getTriggerNodesWithType } from './common/yaml/get_trigger_nodes_with_type';
export type {
  LineParseResult,
  VariableLineParseResult,
  ForeachVariableLineParseResult,
} from './common/yaml/parse_line_for_completion';
export { getZodTypeName } from './common/zod/get_zod_type_name';
export { getDetailedTypeDescription } from './common/zod/zod_type_description';
export { enrichErrorMessage } from './common/zod/enrich_error_message';
export type { ConnectorParamsSchemaResolver } from './common/zod/enrich_error_message';

// Type guards
export { isRecord } from './common/type_guards';

// Validation result types shared by the editor and the server validator
export {
  BATCHED_CUSTOM_MARKER_OWNER,
  isYamlValidationMarkerOwner,
  validationResultFingerprint,
  validationResultsFingerprint,
  filterHighlightableValidationResults,
} from './common/validation/types';
export type {
  ConnectorIdItem,
  StepPropertyItem,
  StepNameInfo,
  YamlValidationErrorSeverity,
  StepPropertyValidationResult,
  YamlValidationDiagnostic,
  YamlValidationResult,
} from './common/validation/types';

// Workflow context schema (variable/step/foreach context used by validation and autocomplete)
export type {
  RegisteredStepOutput,
  WorkflowContextRegistry,
} from './common/validation/context/registry';
export { getContextSchemaForPath } from './common/validation/context/get_context_for_path';
export { createStepContextResolver } from './common/validation/context/step_context_resolver';

// Variable validation rules (the `variable-validation` rule group)
export { collectAllVariables } from './common/validation/variables/collect_all_variables';
export { validateVariables } from './common/validation/variables/validate_variables';
export { validateLiquidYamlScalars } from './common/validation/variables/validate_liquid_yaml_scalars';

// Yaml editing utilities
export { insertStep, modifyStep, modifyStepProperty, deleteStep } from './lib/yaml_edit';
export type { StepDefinition } from './lib/yaml_edit';
