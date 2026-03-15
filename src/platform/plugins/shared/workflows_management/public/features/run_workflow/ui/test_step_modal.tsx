/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { CodeEditor, monaco } from '@kbn/code-editor';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { z } from '@kbn/zod/v4';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import {
  useWorkflowsMonacoTheme,
  WORKFLOWS_MONACO_EDITOR_THEME,
} from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

const RESUME_MODE_DEFAULT: ContextOverrideData = {
  stepContext: {},
  schema: z.object({}).catchall(z.unknown()),
};

export function TestStepModal({
  initialcontextOverride,
  mode = 'test',
  resumeMessage,
  onClose,
  onSubmit,
}: {
  initialcontextOverride?: ContextOverrideData;
  mode?: 'test' | 'resume';
  resumeMessage?: string;
  onSubmit?: (params: { stepInputs: Record<string, any> }) => void;
  onClose: () => void;
}) {
  const styles = useMemoCss(componentStyles);
  useWorkflowsMonacoTheme();
  const contextOverride =
    mode === 'resume' ? RESUME_MODE_DEFAULT : initialcontextOverride ?? RESUME_MODE_DEFAULT;
  const [inputsJson, setInputsJson] = React.useState<string>(
    JSON.stringify(contextOverride.stepContext, null, 2)
  );
  const [isJsonValid, setIsJsonValid] = React.useState<boolean>(true);
  const modalTitleId = useGeneratedHtmlId();
  const id = 'json-editor-schema';

  const jsonSchema = useMemo(() => {
    return z.toJSONSchema(contextOverride.schema, {
      target: 'draft-7',
    });
  }, [contextOverride.schema]);

  const schemaUri = useMemo(() => `inmemory://schemas/${id}`, [id]);

  // Hook Monaco on mount to register the schema for validation + suggestions
  const mountedOnce = useRef(false);
  const handleMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      if (mountedOnce.current) return;
      mountedOnce.current = true;

      try {
        // First, configure the JSON language service with schema validation
        const currentModel = editor.getModel();
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: false,
          enableSchemaRequest: false,
          schemas: [
            {
              uri: schemaUri, // schema URI
              fileMatch: [currentModel?.uri.toString() ?? ''], // bind to this specific model URI
              schema: jsonSchema as any,
            },
          ],
        });
      } catch (error) {
        // Monaco setup failed - fall back to basic JSON editing
      }

      // Optional: seed example if editor is empty
      if (!editor.getValue()?.trim()) {
        editor.setValue(JSON.stringify(contextOverride.stepContext, null, 2));
      }
    },
    [contextOverride.stepContext, jsonSchema, schemaUri]
  );

  useEffect(() => {
    try {
      JSON.parse(inputsJson);
      setIsJsonValid(true);
    } catch (e) {
      setIsJsonValid(false);
    }
  }, [inputsJson]);

  const handleInputChange = (value: string) => {
    setInputsJson(value);
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ stepInputs: JSON.parse(inputsJson) });
    }
  };

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      maxWidth={false}
      onClose={onClose}
      data-test-subj="workflowTestStepModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              {mode === 'resume' ? (
                <FormattedMessage
                  id="workflows.testStepModal.resumeTitle"
                  defaultMessage="Provide action"
                />
              ) : (
                <FormattedMessage id="workflows.testStepModal.title" defaultMessage="Test step" />
              )}
            </EuiFlexItem>
            <EuiFlexItem css={styles.description}>
              {mode === 'resume' ? (
                <span>
                  {resumeMessage ?? (
                    <FormattedMessage
                      id="workflows.testStepModal.resumeDescription"
                      defaultMessage="Provide input to resume the workflow."
                    />
                  )}
                </span>
              ) : (
                <FormattedMessage
                  id="workflows.testStepModal.description"
                  defaultMessage="Test run with current changes and provided payload. Will not be saved in history."
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody
        css={({ euiTheme }) => ({
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
          borderBottom: `1px solid ${euiTheme.colors.borderBasePlain}`,
        })}
      >
        <CodeEditor
          languageId="json"
          value={inputsJson}
          width={1000}
          height={500}
          editorDidMount={handleMount}
          onChange={handleInputChange}
          dataTestSubj={'workflow-event-json-editor'}
          // override the z-index of the hover widget to be above modal's z-index (6000)
          overflowWidgetsContainerZIndexOverride={6001}
          options={{
            language: 'json',
            fixedOverflowWidgets: true,
            lineNumbersMinChars: 2,
            theme: WORKFLOWS_MONACO_EDITOR_THEME,
            automaticLayout: true,
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            overviewRulerBorder: false,
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            hover: {
              enabled: true,
            },
          }}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          onClick={handleSubmit}
          disabled={!isJsonValid}
          color={mode === 'resume' ? 'warning' : 'success'}
          iconType={mode === 'resume' ? 'check' : 'play'}
          size="s"
          data-test-subj="workflowSubmitStepRun"
        >
          {mode === 'resume' ? (
            <FormattedMessage id="workflows.testStepModal.resumeBtn" defaultMessage="Resume" />
          ) : (
            <FormattedMessage id="workflows.testStepModal.submitRunBtn" defaultMessage="Run" />
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

const componentStyles = {
  description: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 's'),
      fontWeight: 'normal',
    }),
};
