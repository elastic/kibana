/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { CONSOLE_THEME_ID, CONSOLE_OUTPUT_LANG_ID, monaco } from '@kbn/monaco';
import { useEditorReadContext, useRequestReadContext } from '../../../contexts';
import { convertMapboxVectorTileToJson } from '../legacy/console_editor/mapbox_vector_tile';
import {
  isJSONContentType,
  isMapboxVectorTile,
  safeExpandLiteralStrings,
  languageForContentType,
} from '../utilities';
import { useResizeCheckerUtils } from './use_resize_checker_utils';

export const MonacoEditorOutput: FunctionComponent = () => {
  const { settings: readOnlySettings } = useEditorReadContext();
  const {
    lastResult: { data },
  } = useRequestReadContext();
  const [value, setValue] = useState('');
  const [mode, setMode] = useState('text');
  const divRef = useRef<HTMLDivElement | null>(null);
  const { setupResizeChecker, destroyResizeChecker } = useResizeCheckerUtils();

  const editorDidMountCallback = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      setupResizeChecker(divRef.current!, editor);
    },
    [setupResizeChecker]
  );

  const editorWillUnmountCallback = useCallback(() => {
    destroyResizeChecker();
  }, [destroyResizeChecker]);

  useEffect(() => {
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
    } else {
      setValue('');
    }
  }, [readOnlySettings, data, value]);

  return (
    <div
      css={css`
        width: 100%;
      `}
      ref={divRef}
    >
      <EuiScreenReaderOnly>
        <label htmlFor={'ConAppOutputTextarea'}>
          {i18n.translate('console.outputTextarea', {
            defaultMessage: 'Dev Tools Console output',
          })}
        </label>
      </EuiScreenReaderOnly>
      <CodeEditor
        languageId={mode}
        value={value}
        fullWidth={true}
        editorDidMount={editorDidMountCallback}
        editorWillUnmount={editorWillUnmountCallback}
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
