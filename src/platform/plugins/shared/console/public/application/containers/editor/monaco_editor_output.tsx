/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  CSSProperties,
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { i18n } from '@kbn/i18n';
import {
  EuiScreenReaderOnly,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { CONSOLE_THEME_ID, CONSOLE_OUTPUT_LANG_ID, monaco } from '@kbn/monaco';
import {
  getStatusCodeDecorations,
  isJSONContentType,
  isMapboxVectorTile,
  safeExpandLiteralStrings,
  languageForContentType,
  convertMapboxVectorTileToJson,
} from './utils';
import { useEditorReadContext, useRequestReadContext, useServicesContext } from '../../contexts';
import { MonacoEditorOutputActionsProvider } from './monaco_editor_output_actions_provider';
import { useResizeCheckerUtils } from './hooks';

export const MonacoEditorOutput: FunctionComponent = () => {
  const context = useServicesContext();
  const {
    services: { notifications },
  } = context;
  const { settings: readOnlySettings } = useEditorReadContext();
  const {
    lastResult: { data },
  } = useRequestReadContext();
  const [value, setValue] = useState('');
  const [mode, setMode] = useState('text');
  const divRef = useRef<HTMLDivElement | null>(null);
  const { setupResizeChecker, destroyResizeChecker } = useResizeCheckerUtils();
  const lineDecorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const actionsProvider = useRef<MonacoEditorOutputActionsProvider | null>(null);
  const [editorActionsCss, setEditorActionsCss] = useState<CSSProperties>({});

  const editorDidMountCallback = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      const provider = new MonacoEditorOutputActionsProvider(editor, setEditorActionsCss);
      actionsProvider.current = provider;

      setupResizeChecker(divRef.current!, editor);
      lineDecorations.current = editor.createDecorationsCollection();
    },
    [setupResizeChecker]
  );

  const editorWillUnmountCallback = useCallback(() => {
    destroyResizeChecker();
  }, [destroyResizeChecker]);

  useEffect(() => {
    // Clean up any existing line decorations
    lineDecorations.current?.clear();
    if (data) {
      const isMultipleRequest = data.length > 1;
      setMode(
        isMultipleRequest
          ? CONSOLE_OUTPUT_LANG_ID
          : languageForContentType(data[0].response.contentType)
      );
      setValue(
        data
          .map((result) => {
            const { value: newValue, contentType } = result.response;

            let editorOutput;
            if (readOnlySettings.tripleQuotes && isJSONContentType(contentType)) {
              editorOutput = safeExpandLiteralStrings(newValue as string);
            } else if (isMapboxVectorTile(contentType)) {
              const vectorTile = new VectorTile(new Protobuf(newValue as ArrayBuffer));
              const vectorTileJson = convertMapboxVectorTileToJson(vectorTile);
              editorOutput = safeExpandLiteralStrings(vectorTileJson as string);
            } else {
              editorOutput = newValue;
            }

            return editorOutput;
          })
          .join('\n')
      );
      if (isMultipleRequest) {
        // If there are multiple responses, add decorations for their status codes
        const decorations = getStatusCodeDecorations(data);
        lineDecorations.current?.set(decorations);
        // Highlight first line of the output editor
        actionsProvider.current?.selectFirstLine();
      }
    } else {
      setValue('');
    }
  }, [readOnlySettings, data, value]);

  const copyOutputCallback = useCallback(async () => {
    const selectedText = (await actionsProvider.current?.getParsedOutput()) as string;

    try {
      if (!window.navigator?.clipboard) {
        throw new Error('Could not copy to clipboard!');
      }

      await window.navigator.clipboard.writeText(selectedText);

      notifications.toasts.addSuccess({
        title: i18n.translate('console.outputPanel.copyOutputToast', {
          defaultMessage: 'Selected output copied to clipboard',
        }),
      });
    } catch (e) {
      notifications.toasts.addDanger({
        title: i18n.translate('console.outputPanel.copyOutputToastFailedMessage', {
          defaultMessage: 'Could not copy selected output to clipboard',
        }),
      });
    }
  }, [notifications.toasts]);

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
      `}
      ref={divRef}
    >
      <EuiFlexGroup
        className="conApp__outputActions"
        responsive={false}
        style={editorActionsCss}
        justifyContent="center"
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('console.outputPanel.copyOutputButtonTooltipContent', {
              defaultMessage: 'Click to copy to clipboard',
            })}
          >
            <EuiButtonIcon
              iconType="copyClipboard"
              onClick={copyOutputCallback}
              data-test-subj="copyOutputButton"
              aria-label={i18n.translate('console.outputPanel.copyOutputButtonTooltipAriaLabel', {
                defaultMessage: 'Click to copy to clipboard',
              })}
              iconSize={'s'}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiScreenReaderOnly>
        <label htmlFor={'ConAppOutputTextarea'}>
          {i18n.translate('console.monaco.outputTextarea', {
            defaultMessage: 'Dev Tools Console output',
          })}
        </label>
      </EuiScreenReaderOnly>
      <CodeEditor
        dataTestSubj={'consoleMonacoOutput'}
        languageId={mode}
        value={value}
        fullWidth={true}
        editorDidMount={editorDidMountCallback}
        editorWillUnmount={editorWillUnmountCallback}
        enableFindAction={true}
        options={{
          readOnly: true,
          fontSize: readOnlySettings.fontSize,
          wordWrap: readOnlySettings.wrapMode === true ? 'on' : 'off',
          theme: CONSOLE_THEME_ID,
          automaticLayout: true,
        }}
      />
    </div>
  );
};
