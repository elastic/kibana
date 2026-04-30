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
export type { FormattedZodError, MockZodError, MockZodIssue } from './common/errors';

// Regex patterns and predicates
export {
  VARIABLE_REGEX,
  VARIABLE_REGEX_GLOBAL,
  UNFINISHED_VARIABLE_REGEX_GLOBAL,
  ALLOWED_KEY_REGEX,
  PROPERTY_PATH_REGEX,
  LIQUID_FILTER_REGEX,
  LIQUID_BLOCK_FILTER_REGEX,
  LIQUID_BLOCK_KEYWORD_REGEX,
  LIQUID_BLOCK_START_REGEX,
  LIQUID_BLOCK_END_REGEX,
  LIQUID_EXPRESSION_REGEX_GLOBAL,
  LIQUID_OUTPUT_REGEX_GLOBAL,
  LIQUID_TAG_REGEX_GLOBAL,
  DYNAMIC_VALUE_REGEX,
  VARIABLE_VALUE_REGEX,
  LIQUID_TAG_VALUE_REGEX,
  isDynamicValue,
  isVariableValue,
  isLiquidTagValue,
} from './common/regex';

// Liquid (template engine + cache + validation)
export { extractLiquidErrorPosition } from './common/liquid/extract_liquid_error_position';
export { getLiquidInstance, parseTemplateString } from './common/liquid/liquid_parse_cache';
export { validateLiquidTemplate } from './common/liquid/validate_liquid_template';
export type { LiquidValidationError } from './common/liquid/validate_liquid_template';

// YAML parsing and manipulation
export { getYamlDocumentErrors } from './common/yaml/validate_yaml_document';
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
export {
  stringifyWorkflowDefinition,
  WORKFLOW_DEFINITION_KEYS_ORDER,
} from './common/yaml/stringify_workflow_definition';
export {
  parseWorkflowYamlToJSON,
  type ParseWorkflowYamlToJSONResult,
  type ParseWorkflowYamlToJSONOptions,
} from './common/yaml/parse_workflow_yaml_to_json';
export { parseYamlToJSONWithoutValidation } from './common/yaml/parse_workflow_yaml_to_json_without_validation';
export { parseWorkflowYamlForAutocomplete } from './common/yaml/parse_workflow_yaml_for_autocomplete';

// Zod helpers
export { inferZodType } from './common/zod/infer_zod_type';
export { getZodTypeName, getLiteralDescription } from './common/zod/get_zod_type_name';
export {
  getCompactTypeDescription,
  getDetailedTypeDescription,
} from './common/zod/zod_type_description';
export { formatZodError } from './common/zod/format_zod_error';
export type { FormatZodErrorOptions } from './common/zod/format_zod_error';
export { enrichErrorMessage, clearEnrichmentCache } from './common/zod/enrich_error_message';
export type {
  ErrorContext,
  EnrichmentResult,
  ConnectorParamsSchemaResolver,
} from './common/zod/enrich_error_message';
