/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiScreenReaderOnly, withEuiTheme } from '@elastic/eui';
import type { WithEuiThemeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { createReadOnlyAceEditor, CustomAceEditor } from '../models/sense_editor';
// @ts-ignore
import { Mode as InputMode } from '../models/legacy_core_editor/mode/input';
import { Mode as OutputMode } from '../models/legacy_core_editor/mode/output';

interface EditorExampleProps {
  panel: string;
  example?: string;
  theme: WithEuiThemeProps['theme'];
  linesOfExampleCode?: number;
  mode?: string;
}

const exampleText = `
GET _search
{
  "query": {
    "match_all": {}
  }
}
`;

const EditorExample = ({
  panel,
  example,
  theme,
  linesOfExampleCode = 6,
  mode = 'input',
}: EditorExampleProps) => {
  const inputId = `help-example-${panel}-input`;
  const wrapperDivRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<CustomAceEditor>();

  useEffect(() => {
    if (wrapperDivRef.current) {
      editorRef.current = createReadOnlyAceEditor(wrapperDivRef.current);

      const editor = editorRef.current;
      const editorMode = mode === 'input' ? new InputMode() : new OutputMode();
      editor.update((example || exampleText).trim(), editorMode);
      editor.session.setUseWorker(false);
      editor.setHighlightActiveLine(false);

      const textareaElement = wrapperDivRef.current.querySelector('textarea');
      if (textareaElement) {
        textareaElement.setAttribute('id', inputId);
        textareaElement.setAttribute('readonly', 'true');
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [example, inputId, mode]);

  const wrapperDivStyle = {
    height: `${parseInt(theme.euiTheme.size.base, 10) * linesOfExampleCode}px`,
    margin: `${theme.euiTheme.size.base} 0`,
  };

  return (
    <>
      <EuiScreenReaderOnly>
        <label htmlFor={inputId}>
          {i18n.translate('console.exampleOutputTextarea', {
            defaultMessage: 'Dev Tools Console editor example',
          })}
        </label>
      </EuiScreenReaderOnly>
      <div ref={wrapperDivRef} className="conApp_example" css={wrapperDivStyle} />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default withEuiTheme(EditorExample);
