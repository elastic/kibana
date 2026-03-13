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

export function TestStepModal({
  initialcontextOverride,
  onClose,
  onSubmit,
}: {
  initialcontextOverride: ContextOverrideData;
  onSubmit?: (params: { stepInputs: Record<string, any> }) => void;
  onClose: () => void;
}) {
  const styles = useMemoCss(componentStyles);
  useWorkflowsMonacoTheme();
  const [inputsJson, setInputsJson] = React.useState<string>(
    JSON.stringify(initialcontextOverride.stepContext, null, 2)
  );
  const [isJsonValid, setIsJsonValid] = React.useState<boolean>(true);
  const modalTitleId = useGeneratedHtmlId();
  const id = 'json-editor-schema';

  const jsonSchema = useMemo(() => {
    return z.toJSONSchema(initialcontextOverride.schema, {
      target: 'draft-7',
    });
  }, [initialcontextOverride.schema]);

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
        editor.setValue(JSON.stringify(initialcontextOverride.stepContext, null, 2));
      }
    },
    [initialcontextOverride.stepContext, jsonSchema, schemaUri]
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
              <FormattedMessage id="workflows.testStepModal.title" defaultMessage="Test step" />
            </EuiFlexItem>
            <EuiFlexItem css={styles.description}>
              <FormattedMessage
                id="workflows.testStepModal.description"
                defaultMessage="Test run with current changes and provided payload. Will not be saved in history."
              />
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
          color="success"
          iconType="play"
          size="s"
          data-test-subj="workflowSubmitStepRun"
        >
          <FormattedMessage id="workflows.testStepModal.submitRunBtn" defaultMessage="Run" />
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
