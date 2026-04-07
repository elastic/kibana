/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';
import type { JSONSchema7 } from 'json-schema';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { CodeEditor, monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { applyInputDefaults } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { InputValidationCallout } from './input_validation_callout';
import { generateSampleFromJsonSchema } from '../../../../common/lib/generate_sample_from_json_schema';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

const SCHEMA_URI = `inmemory://schemas/workflow-manual-json-editor-schema`;

const getDefaultWorkflowInput = (inputs?: JsonModelSchemaType): Record<string, unknown> => {
  if (!inputs?.properties) {
    return {};
  }

  // Use applyInputDefaults to get defaults with $ref resolution and nested object support
  // This ensures the same behavior as legacy format and handles all JSON Schema features
  const defaults = applyInputDefaults(undefined, inputs) ?? {};

  // Fallback to generating samples for properties with no defaults
  for (const [propertyName, propertySchema] of Object.entries(inputs.properties)) {
    if (defaults[propertyName] === undefined) {
      const jsonSchema = propertySchema as JSONSchema7;
      defaults[propertyName] = generateSampleFromJsonSchema(jsonSchema);
    }
  }

  return defaults;
};

interface WorkflowExecuteManualFormProps {
  value: string;
  inputs?: JsonModelSchemaType; // normalized inputs
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}
export const WorkflowExecuteManualForm = ({
  value,
  inputs,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteManualFormProps): React.JSX.Element => {
  const inputsValidator = useMemo(() => buildFieldsZodValidator(inputs), [inputs]);

  useEffect(() => {
    setValue(JSON.stringify(getDefaultWorkflowInput(inputs), null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate inputs on initial load and when definition changes
  useEffect(() => {
    if (value) {
      try {
        const res = inputsValidator.safeParse(JSON.parse(value));
        if (!res.success) {
          setErrors(
            res.error.issues
              .map((e) => (e.path.length > 0 ? `${e.path.join('.')}: ${e.message}` : e.message))
              .join(', ')
          );
        } else {
          setErrors(null);
        }
      } catch (e: Error | unknown) {
        setErrors(
          i18n.translate('workflows.workflowExecuteManualForm.invalidJson', {
            defaultMessage: 'Invalid JSON: {message}',
            values: { message: e instanceof Error ? e.message : String(e) },
          })
        );
      }
    }
  }, [inputsValidator, value, setErrors]);

  const mountedOnce = useRef(false);
  const handleMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      if (!inputs || mountedOnce.current) return;
      mountedOnce.current = true;

      try {
        const currentModel = editor.getModel();
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: false,
          enableSchemaRequest: false,
          schemas: [
            {
              uri: SCHEMA_URI,
              fileMatch: [currentModel?.uri.toString() ?? ''],
              schema: inputs,
            },
          ],
        });
      } catch {
        // Monaco setup failed — fall back to basic JSON editing
      }
    },
    [inputs]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      css={css`
        min-height: 0;
      `}
    >
      {errors && (
        <EuiFlexItem grow={false}>
          <InputValidationCallout errors={errors} />
        </EuiFlexItem>
      )}

      <EuiFlexItem
        css={css`
          overflow: hidden;
        `}
      >
        <EuiFormRow
          label={i18n.translate('workflows.workflowExecuteManualForm.inputDataLabel', {
            defaultMessage: 'Input Data',
          })}
          fullWidth
          css={css`
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            .euiFormRow__fieldWrapper {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
            }
          `}
        >
          <CodeEditor
            languageId="json"
            value={value}
            width="100%"
            height="100%"
            onChange={setValue}
            editorDidMount={handleMount}
            dataTestSubj={'workflow-manual-json-editor'}
            overflowWidgetsContainerZIndexOverride={6001}
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
