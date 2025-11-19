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
import React, { useCallback, useEffect, useMemo } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { z } from '@kbn/zod';
import { convertJsonSchemaToZod } from '../../../../common/lib/json_schema_to_zod';

const makeWorkflowInputsValidator = (inputs: WorkflowYaml['inputs']) => {
  // Normalize inputs to the new JSON Schema format (handles backward compatibility)
  // This handles both array (legacy) and object (new) formats
  const normalizedInputs = normalizeInputsToJsonSchema(inputs);

  if (!normalizedInputs?.properties) {
    return z.object({});
  }

  const validatorObject: Record<string, z.ZodType> = {};

  for (const [propertyName, propertySchema] of Object.entries(normalizedInputs.properties)) {
    const jsonSchema = propertySchema as JSONSchema7;

    // Convert JSON Schema to Zod schema
    let zodSchema: z.ZodType = convertJsonSchemaToZod(jsonSchema);

    // Apply default value if present
    if (jsonSchema.default !== undefined) {
      zodSchema = zodSchema.default(jsonSchema.default);
    }

    // Check if this property is required
    const isRequired = normalizedInputs.required?.includes(propertyName) ?? false;
    if (!isRequired) {
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

const getDefaultWorkflowInput = (definition: WorkflowYaml): string => {
  // Normalize inputs to the new JSON Schema format (handles backward compatibility)
  const normalizedInputs = normalizeInputsToJsonSchema(definition.inputs);

  const inputPlaceholder: Record<string, unknown> = {};

  if (normalizedInputs?.properties) {
    for (const [propertyName, propertySchema] of Object.entries(normalizedInputs.properties)) {
      const jsonSchema = propertySchema as JSONSchema7;

      // Use default value if present, otherwise generate a sample
      if (jsonSchema.default !== undefined) {
        inputPlaceholder[propertyName] = jsonSchema.default;
      } else {
        inputPlaceholder[propertyName] = generateSampleFromJsonSchema(jsonSchema);
      }
    }
  }

  return JSON.stringify(inputPlaceholder, null, 2);
};

export const WorkflowExecuteManualForm = ({
  definition,
  value,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteManualFormProps): React.JSX.Element => {
  const inputsValidator = useMemo(
    () => makeWorkflowInputsValidator(definition?.inputs),
    [definition?.inputs]
  );

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

  useEffect(() => {
    if (!value && definition) {
      handleChange(getDefaultWorkflowInput(definition));
    }
  }, [definition, value, handleChange]);

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
              theme: 'vs-light',
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
