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
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [overflowWidgetsDomNode, setOverflowWidgetsDomNode] = useState<HTMLDivElement | null>(null);
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

  const modelUri = useMemo(() => `inmemory://models/${id}.json`, [id]);
  const schemaUri = useMemo(() => `inmemory://schemas/${id}`, [id]);

  useEffect(() => {
    const overlayElement = document.createElement('div');
    overlayElement.id = 'step-mock-data-overlay-root';
    overlayElement.style.zIndex = '6001'; // should be above modal's z-index (6000)
    overlayElement.style.position = 'fixed';
    overlayElement.classList.add('monaco-editor');
    document.body.appendChild(overlayElement);
    setOverflowWidgetsDomNode(overlayElement);

    return () => {
      document.body.removeChild(overlayElement);
    };
  }, [setOverflowWidgetsDomNode]);

  // Hook Monaco on mount to register the schema for validation + suggestions
  const mountedOnce = useRef(false);
  const handleMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      if (mountedOnce.current) return;
      mountedOnce.current = true;

      try {
        // First, configure the JSON language service with schema validation
        monaco.languages.json?.jsonDefaults?.setDiagnosticsOptions({
          validate: true,
          allowComments: false,
          enableSchemaRequest: false,
          schemas: [
            {
              uri: schemaUri, // schema URI
              fileMatch: [modelUri], // bind to this specific model URI
              schema: jsonSchema as any,
            },
          ],
        });

        // Get current editor content
        const text =
          editor.getValue() || JSON.stringify(initialcontextOverride.stepContext, null, 2);

        // Create model with the specific URI that matches our schema fileMatch
        const uri = monaco.Uri.parse(modelUri);
        const model = monaco.editor.createModel(text, 'json', uri);

        // Set the model to the editor
        editor.setModel(model);
      } catch (error) {
        // Monaco setup failed - fall back to basic JSON editing
      }

      // Optional: seed example if editor is empty
      if (!editor.getValue()?.trim()) {
        editor.setValue(JSON.stringify(initialcontextOverride.stepContext, null, 2));
      }
    },
    [initialcontextOverride.stepContext, jsonSchema, modelUri, schemaUri]
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

  if (!overflowWidgetsDomNode) {
    return null;
  }

  return (
    <EuiModal aria-labelledby={modalTitleId} maxWidth={false} onClose={onClose}>
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
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <CodeEditor
              languageId="json"
              value={inputsJson}
              width={1000}
              height={500}
              editorDidMount={handleMount}
              onChange={handleInputChange}
              dataTestSubj={'workflow-event-json-editor'}
              options={{
                language: 'json',
                overflowWidgetsDomNode,
                fixedOverflowWidgets: true,
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
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem css={{ alignSelf: 'flex-end' }} grow={false}>
            <EuiButton
              onClick={handleSubmit}
              disabled={!isJsonValid}
              color="success"
              iconType="play"
              size="s"
            >
              <FormattedMessage id="workflows.testStepModal.submitRunBtn" defaultMessage="Run" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
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
