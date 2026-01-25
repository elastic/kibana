/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { JSONSchema7 } from 'json-schema';
import React, { useCallback, useEffect } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  applyInputDefaults,
  normalizeInputsToJsonSchema,
  normalizeInputsToJsonSchemaAsync,
  resolveRef,
} from '@kbn/workflows/spec/lib/input_conversion';
import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { convertJsonSchemaToZod } from '../../../../common/lib/json_schema_to_zod';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

// Recursively convert JSON Schema to Zod, resolving $ref along the way
function convertJsonSchemaToZodWithRefs(
  jsonSchema: JSONSchema7,
  inputsSchema: ReturnType<typeof normalizeInputsToJsonSchema>
): z.ZodType {
  // Resolve $ref if present
  let schemaToConvert = jsonSchema;
  if (jsonSchema.$ref) {
    const resolved = resolveRef(jsonSchema.$ref, inputsSchema);
    if (resolved) {
      schemaToConvert = resolved;
    }
  }

  // After resolving $ref, try using fromJSONSchema (which handles objects, defaults, required, etc.)
  const zodSchema = fromJSONSchema(schemaToConvert as Record<string, unknown>);
  if (zodSchema !== undefined) {
    return zodSchema;
  }

  // Fallback: If fromJSONSchema doesn't support this schema, use manual conversion
  // This handles edge cases and ensures backward compatibility
  if (schemaToConvert.type === 'object' && schemaToConvert.properties) {
    const shape: Record<string, z.ZodType> = {};
    for (const [key, propSchema] of Object.entries(schemaToConvert.properties)) {
      const prop = propSchema as JSONSchema7;
      let zodProp = convertJsonSchemaToZodWithRefs(prop, inputsSchema);

      // Check if required
      const isRequired = schemaToConvert.required?.includes(key) ?? false;

      // Apply default if present
      if (prop.default !== undefined) {
        zodProp = zodProp.default(prop.default);
      } else if (!isRequired) {
        zodProp = zodProp.optional();
      }

      shape[key] = zodProp;
    }
    return z.object(shape);
  }

  // For non-object types, use the standard converter
  return convertJsonSchemaToZod(schemaToConvert);
}

const makeWorkflowInputsValidator = async (
  inputs: WorkflowYaml['inputs'],
  resolvedInputsSchema?: ReturnType<typeof normalizeInputsToJsonSchema>
) => {
  // Use resolved schema if provided, otherwise normalize synchronously (for backward compatibility)
  const normalizedInputs = resolvedInputsSchema || normalizeInputsToJsonSchema(inputs);

  if (!normalizedInputs?.properties) {
    return z.object({});
  }

  const validatorObject: Record<string, z.ZodType> = {};

  for (const [propertyName, propertySchema] of Object.entries(normalizedInputs.properties)) {
    const jsonSchema = propertySchema as JSONSchema7;

    // For resolved schemas, $ref should already be inlined, but check anyway
    const resolvedSchema = jsonSchema.$ref
      ? resolveRef(jsonSchema.$ref, normalizedInputs) || jsonSchema
      : jsonSchema;

    // Convert JSON Schema to Zod schema, resolving $ref if needed
    let zodSchema: z.ZodType = convertJsonSchemaToZodWithRefs(jsonSchema, normalizedInputs);

    // Apply default from resolved schema if present
    if (resolvedSchema.default !== undefined) {
      zodSchema = zodSchema.default(resolvedSchema.default);
    }

    // Make optional if not required and no default
    const isRequired = normalizedInputs.required?.includes(propertyName) ?? false;
    if (!isRequired && resolvedSchema.default === undefined) {
      zodSchema = zodSchema.optional();
    }

    validatorObject[propertyName] = zodSchema;
  }

  return z.object(validatorObject);
};

interface WorkflowExecuteManualFormProps {
  definition: WorkflowYaml | null;
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

/**
 * Generates a sample object from a JSON Schema
 */
function generateSampleFromJsonSchema(schema: JSONSchema7): unknown {
  if (schema.default !== undefined) {
    return schema.default;
  }

  switch (schema.type) {
    case 'string':
      return schema.format === 'email' ? 'user@example.com' : 'string';
    case 'number':
      return 0;
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array': {
      const items = schema.items as JSONSchema7 | undefined;
      if (items) {
        return [generateSampleFromJsonSchema(items)];
      }
      return [];
    }
    case 'object': {
      const sample: Record<string, unknown> = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const prop = propSchema as JSONSchema7;
          const isRequired = schema.required?.includes(key) ?? false;
          if (isRequired || prop.default !== undefined) {
            sample[key] = generateSampleFromJsonSchema(prop);
          }
        }
      }
      return sample;
    }
    default:
      return undefined;
  }
}

export const WorkflowExecuteManualForm = ({
  definition,
  value,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteManualFormProps): React.JSX.Element => {
  const [resolvedInputsSchema, setResolvedInputsSchema] = React.useState<
    ReturnType<typeof normalizeInputsToJsonSchema> | undefined
  >(undefined);
  const [inputsValidator, setInputsValidator] = React.useState<z.ZodType>(z.object({}));

  // Resolve inputs schema asynchronously and create validator
  React.useEffect(() => {
    const resolveAndCreateValidator = async () => {
      if (definition?.inputs) {
        try {
          const resolved = await normalizeInputsToJsonSchemaAsync(definition.inputs);
          setResolvedInputsSchema(resolved);
          const validator = await makeWorkflowInputsValidator(definition.inputs, resolved);
          setInputsValidator(validator);
        } catch (error) {
          // Fallback to sync version
          const validator = await makeWorkflowInputsValidator(definition.inputs);
          setInputsValidator(validator);
          setResolvedInputsSchema(normalizeInputsToJsonSchema(definition.inputs));
        }
      } else {
        setInputsValidator(z.object({}));
        setResolvedInputsSchema(undefined);
      }
    };
    resolveAndCreateValidator();
  }, [definition?.inputs]);

  const handleChange = useCallback(
    (data: string) => {
      setValue(data);
      if (definition?.inputs) {
        try {
          const res = inputsValidator.safeParse(JSON.parse(data));
          if (!res.success) {
            setErrors(
              res.error.issues
                .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')
            );
          } else {
            setErrors(null);
          }
        } catch (e: Error | unknown) {
          setErrors(
            i18n.translate('workflows.workflowExecuteManualForm.invalidJSONError', {
              defaultMessage: 'Invalid JSON: {message}',
              values: {
                message: e instanceof Error ? e.message : String(e),
              },
            })
          );
        }
      }
    },
    [setValue, definition?.inputs, inputsValidator, setErrors]
  );

  // Validate inputs on initial load and when definition changes
  useEffect(() => {
    if (definition?.inputs && value) {
      try {
        const res = inputsValidator.safeParse(JSON.parse(value));
        if (!res.success) {
          setErrors(
            res.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
          );
        } else {
          setErrors(null);
        }
      } catch (e: Error | unknown) {
        // Ignore JSON parse errors
      }
    }
  }, [definition?.inputs, inputsValidator, value, setErrors]);

  // Set defaults if value is empty or only contains empty object
  useEffect(() => {
    if (definition && resolvedInputsSchema) {
      const isEmpty = !value || value.trim() === '' || value.trim() === '{}';
      if (isEmpty) {
        // Use resolved schema for defaults
        const defaults = applyInputDefaults(undefined, resolvedInputsSchema);
        if (defaults && typeof defaults === 'object' && Object.keys(defaults).length > 0) {
          handleChange(JSON.stringify(defaults, null, 2));
        } else {
          // Fallback to generating samples
          const inputPlaceholder: Record<string, unknown> = {};
          for (const [propertyName, propertySchema] of Object.entries(
            resolvedInputsSchema.properties || {}
          )) {
            const jsonSchema = propertySchema as JSONSchema7;
            inputPlaceholder[propertyName] = generateSampleFromJsonSchema(jsonSchema);
          }
          handleChange(JSON.stringify(inputPlaceholder, null, 2));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, resolvedInputsSchema]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiSpacer size="s" />
      {/* Error Display */}
      {errors && (
        <>
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              title="Input data is not valid"
              color="danger"
              iconType="help"
              size="s"
            >
              <p>{errors}</p>
            </EuiCallOut>
          </EuiFlexItem>
        </>
      )}

      {/* Input Data Editor */}
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('workflows.workflowExecuteManualForm.inputDataLabel', {
            defaultMessage: 'Input Data',
          })}
          helpText={i18n.translate('workflows.workflowExecuteManualForm.inputDataHelpText', {
            defaultMessage: 'JSON payload that will be passed to the workflow',
          })}
          fullWidth
        >
          <CodeEditor
            languageId="json"
            value={value}
            fitToContent={{
              minLines: 5,
              maxLines: 10,
            }}
            width="100%"
            onChange={handleChange}
            dataTestSubj={'workflow-manual-json-editor'}
            options={{
              language: 'json',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              lineNumbers: 'on',
              glyphMargin: true,
              tabSize: 2,
              lineNumbersMinChars: 2,
              insertSpaces: true,
              fontSize: 14,
              renderWhitespace: 'all',
              wordWrapColumn: 80,
              wrappingIndent: 'indent',
              theme: WORKFLOWS_MONACO_EDITOR_THEME,
              formatOnType: true,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              wordBasedSuggestions: false,
              parameterHints: {
                enabled: false,
              },
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
