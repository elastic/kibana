/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { WorkflowInputChoiceSchema, WorkflowInputSchema, WorkflowYaml } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { convertInlineSchemaToZod } from '../../../../common/lib/zod';

/**
 * Creates a sample object from a schema definition for use as a placeholder.
 */
function createSampleObjectFromSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return {};
  }
  const sample: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === 'string') {
      // Simple type definition - use defaultWorkflowInputsMappings directly
      const mapping = defaultWorkflowInputsMappings[value];
      if (typeof mapping === 'function') {
        // For functions (array, object), use default values
        if (value === 'array') {
          sample[key] = [];
        } else if (value === 'object') {
          sample[key] = {};
        } else {
          sample[key] = null;
        }
      } else {
        sample[key] = mapping;
      }
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      sample[key] = [];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively create sample for nested objects
      sample[key] = createSampleObjectFromSchema(value as Record<string, unknown>);
    }
  }
  return sample;
}

const makeWorkflowInputsValidator = (inputs: Array<z.infer<typeof WorkflowInputSchema>>) => {
  return z.object(
    inputs.reduce((acc, input) => {
      switch (input.type) {
        case 'string':
          acc[input.name] = input.required ? z.string() : z.string().optional();
          break;
        case 'number':
          acc[input.name] = input.required ? z.number() : z.number().optional();
          break;
        case 'boolean':
          acc[input.name] = input.required ? z.boolean() : z.boolean().optional();
          break;
        case 'choice':
          acc[input.name] = input.required
            ? z.enum(input.options as [string, ...string[]])
            : z.enum(input.options as [string, ...string[]]).optional();
          break;
        case 'array': {
          const arraySchemas = [z.array(z.string()), z.array(z.number()), z.array(z.boolean())];
          const { minItems, maxItems } = input;
          const applyConstraints = (
            schema: z.ZodArray<z.ZodString | z.ZodNumber | z.ZodBoolean>
          ) => {
            let s = schema;
            if (minItems != null) s = s.min(minItems);
            if (maxItems != null) s = s.max(maxItems);
            return s;
          };
          const arr = z.union(
            arraySchemas.map(applyConstraints) as [
              z.ZodArray<z.ZodString>,
              z.ZodArray<z.ZodNumber>,
              z.ZodArray<z.ZodBoolean>
            ]
          );
          acc[input.name] = input.required ? arr : arr.optional();
          break;
        }
        case 'object': {
          // Handle object type inputs
          const objectInput = input as Extract<typeof input, { type: 'object' }>;
          let objectSchema: z.ZodType;
          if (objectInput.schema && typeof objectInput.schema === 'object') {
            // Inline schema provided - convert to Zod schema
            objectSchema = convertInlineSchemaToZod(objectInput.schema as Record<string, unknown>);
          } else {
            // No schema provided - accept any JSON object
            objectSchema = z.record(z.string(), z.any());
          }
          acc[input.name] = input.required ? objectSchema : objectSchema.optional();
          break;
        }
      }
      return acc;
    }, {} as Record<string, z.ZodType>)
  );
};

interface WorkflowExecuteManualFormProps {
  definition: WorkflowYaml | null;
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

type WorkflowInputPlaceholder =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | boolean[]
  | Record<string, unknown>
  | ((input: z.infer<typeof WorkflowInputSchema>) => string | Record<string, unknown>);

const defaultWorkflowInputsMappings: Record<string, WorkflowInputPlaceholder> = {
  string: 'Enter a string',
  number: 0,
  boolean: false,
  choice: (input: z.infer<typeof WorkflowInputSchema>) =>
    `Select an option: ${(input as z.infer<typeof WorkflowInputChoiceSchema>).options.join(', ')}`,
  array: (input: z.infer<typeof WorkflowInputSchema>) =>
    'Enter array of strings, numbers or booleans',
  object: (input: z.infer<typeof WorkflowInputSchema>) => {
    const objectInput = input as Extract<typeof input, { type: 'object' }>;
    return createSampleObjectFromSchema(objectInput.schema as Record<string, unknown>);
  },
};

const getDefaultWorkflowInput = (definition: WorkflowYaml): string => {
  const inputPlaceholder: Record<string, WorkflowInputPlaceholder> = {};

  if (definition.inputs) {
    definition.inputs.forEach((input: z.infer<typeof WorkflowInputSchema>) => {
      let placeholder: WorkflowInputPlaceholder = defaultWorkflowInputsMappings[input.type];
      if (typeof placeholder === 'function') {
        placeholder = placeholder(input);
      }
      inputPlaceholder[input.name] = input.default || placeholder;
    });
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
    () => makeWorkflowInputsValidator(definition?.inputs || []),
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
