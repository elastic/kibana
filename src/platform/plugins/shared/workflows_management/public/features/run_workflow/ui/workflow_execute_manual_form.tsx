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
  | ((input: z.infer<typeof WorkflowInputSchema>) => string);

const defaultWorkflowInputsMappings: Record<string, WorkflowInputPlaceholder> = {
  string: 'Enter a string',
  number: 0,
  boolean: false,
  choice: (input: z.infer<typeof WorkflowInputSchema>) =>
    `Select an option: ${(input as z.infer<typeof WorkflowInputChoiceSchema>).options.join(', ')}`,
  array: (input: z.infer<typeof WorkflowInputSchema>) =>
    'Enter array of strings, numbers or booleans',
};

const getDefaultWorkflowInput = (definition: WorkflowYaml): string => {
  const inputPlaceholder: Record<string, WorkflowInputPlaceholder> = {};

  if (definition.inputs) {
    definition.inputs.forEach((input: z.infer<typeof WorkflowInputSchema>) => {
      let placeholder: WorkflowInputPlaceholder = defaultWorkflowInputsMappings[input.type];
      if (typeof placeholder === 'function') {
        placeholder = placeholder(input);
      }

      // Always calculate dynamic dates for date-related inputs (start/end)
      // This ensures dates are always fresh, even if workflow was registered with old hardcoded dates
      const defaultValue = input.default || '';
      const isDynamicPlaceholder =
        typeof defaultValue === 'string' &&
        (defaultValue.includes('__DYNAMIC_') ||
          defaultValue === '__DYNAMIC_24H_AGO__' ||
          defaultValue === '__DYNAMIC_7D_AGO__' ||
          defaultValue === '__DYNAMIC_NOW__');

      // Always calculate dates for start/end inputs, regardless of default value
      // This ensures dates are always current when the form is opened
      if (input.type === 'string' && input.name === 'start') {
        // Check if it's a 7-day placeholder or default to 24 hours ago
        if (defaultValue === '__DYNAMIC_7D_AGO__') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setTime(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
          inputPlaceholder[input.name] = sevenDaysAgo.toISOString();
        } else {
          // Always default to 24 hours ago for start inputs
          const dayAgo = new Date();
          dayAgo.setTime(dayAgo.getTime() - 24 * 60 * 60 * 1000);
          inputPlaceholder[input.name] = dayAgo.toISOString();
        }
      } else if (input.type === 'string' && input.name === 'end') {
        // Always default to now for end inputs
        inputPlaceholder[input.name] = new Date().toISOString();
      } else if (isDynamicPlaceholder) {
        // Handle other dynamic placeholders
        if (defaultValue === '__DYNAMIC_7D_AGO__') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setTime(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
          inputPlaceholder[input.name] = sevenDaysAgo.toISOString();
        } else if (defaultValue === '__DYNAMIC_24H_AGO__') {
          const dayAgo = new Date();
          dayAgo.setTime(dayAgo.getTime() - 24 * 60 * 60 * 1000);
          inputPlaceholder[input.name] = dayAgo.toISOString();
        } else if (defaultValue === '__DYNAMIC_NOW__') {
          inputPlaceholder[input.name] = new Date().toISOString();
        } else {
          inputPlaceholder[input.name] = input.default || placeholder;
        }
      } else {
        inputPlaceholder[input.name] = input.default || placeholder;
      }
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
