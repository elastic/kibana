/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto, WorkflowInputSchema, WorkflowListItemDto } from '@kbn/workflows';
import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
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
      }
      return acc;
    }, {} as Record<string, z.ZodType>)
  );
};

interface WorkflowExecuteManualFormProps {
  workflow: WorkflowDetailDto | WorkflowListItemDto;
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

const defaultWorkflowInputsMappings: Record<string, any> = {
  string: 'Enter a string',
  number: 0,
  boolean: false,
  choice: (input: any) => `Select an option: ${input.options.join(', ')}`,
};

const getDefaultWorkflowInput = (workflow: WorkflowDetailDto | WorkflowListItemDto): string => {
  const inputPlaceholder: Record<string, any> = {};

  if (workflow?.definition!.inputs) {
    workflow.definition!.inputs.forEach((input: any) => {
      let placeholder: string | number | boolean | ((input: any) => string) =
        defaultWorkflowInputsMappings[input.type];
      if (typeof placeholder === 'function') {
        placeholder = placeholder(input);
      }
      inputPlaceholder[input.name] = input.default || placeholder;
    });
  }

  return JSON.stringify(inputPlaceholder, null, 2);
};

export const WorkflowExecuteManualForm = ({
  workflow,
  value,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteManualFormProps): React.JSX.Element => {
  const inputsValidator = useMemo(
    () => makeWorkflowInputsValidator(workflow?.definition!.inputs || []),
    [workflow?.definition]
  );

  const handleChange = useCallback(
    (data: string) => {
      setValue(data);
      if (workflow?.definition!.inputs) {
        try {
          const res = inputsValidator.safeParse(JSON.parse(data));
          if (!res.success) {
            setErrors(
              res.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
            );
          } else {
            setErrors(null);
          }
        } catch (e: Error | any) {
          setErrors(`Invalid JSON: ${e.message || e.toString()}`);
        }
      }
    },
    [setValue, workflow?.definition, inputsValidator, setErrors]
  );

  useEffect(() => {
    if (!value && workflow) {
      handleChange(getDefaultWorkflowInput(workflow));
    }
  }, [workflow, value, handleChange]);

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
          label="Input Data"
          helpText="JSON payload that will be passed to the workflow"
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
            editorDidMount={() => {}}
            onChange={handleChange}
            suggestionProvider={undefined}
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
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
              },
              formatOnType: true,
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
