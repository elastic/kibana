/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This component was ported directly from `advancedSettings`, and hasn't really
// been vetted.  It has, however, been refactored to be compliant with our
// current standards.
//
// @see src/plugins/advanced_settings/public/management_app/components/field/field_code_editor.tsx
//

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { monaco } from '@kbn/monaco';

import {
  CodeEditor as KibanaReactCodeEditor,
  type CodeEditorProps as KibanaReactCodeEditorProps,
  MARKDOWN_LANG_ID,
  XJSON_LANG_ID,
} from '@kbn/code-editor';

type Props = Pick<KibanaReactCodeEditorProps, 'aria-label' | 'value' | 'onChange'>;
type Options = KibanaReactCodeEditorProps['options'];

export interface CodeEditorProps extends Props {
  type: 'markdown' | 'json';
  isReadOnly: boolean;
  name: string;
}

const MIN_DEFAULT_LINES_COUNT = 6;
const MAX_DEFAULT_LINES_COUNT = 30;
// Matches the default `lineHeight` of the `@kbn/code-editor` Monaco editor.
const PLACEHOLDER_LINE_HEIGHT = 21;
const VISIBILITY_ROOT_MARGIN = '200px';

const getPlaceholderHeight = (value: CodeEditorProps['value']): number => {
  const lineCount = String(value ?? '').split('\n').length;
  const clampedLineCount = Math.min(
    Math.max(lineCount, MIN_DEFAULT_LINES_COUNT),
    MAX_DEFAULT_LINES_COUNT
  );
  return clampedLineCount * PLACEHOLDER_LINE_HEIGHT;
};

const useHasBeenVisible = (ref: React.RefObject<HTMLElement>): boolean => {
  const [hasBeenVisible, setHasBeenVisible] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    const { current: element } = ref;
    if (hasBeenVisible || !element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(({ isIntersecting }) => isIntersecting)) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: VISIBILITY_ROOT_MARGIN }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, hasBeenVisible]);

  return hasBeenVisible;
};

const VisibleCodeEditor = ({ onChange, type, isReadOnly, name, ...props }: CodeEditorProps) => {
  // setting editor height based on lines height and count to stretch and fit its content
  const setEditorCalculatedHeight = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      const editorElement = editor.getDomNode();

      if (!editorElement) {
        return;
      }

      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
      let lineCount = editor.getModel()?.getLineCount() || MIN_DEFAULT_LINES_COUNT;
      if (lineCount < MIN_DEFAULT_LINES_COUNT) {
        lineCount = MIN_DEFAULT_LINES_COUNT;
      } else if (lineCount > MAX_DEFAULT_LINES_COUNT) {
        lineCount = MAX_DEFAULT_LINES_COUNT;
      }
      const height = lineHeight * lineCount;

      editorElement.id = name;
      editorElement.style.height = `${height}px`;
      editor.layout();
    },
    [name]
  );

  const trimEditorBlankLines = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const editorModel = editor.getModel();

    if (!editorModel) {
      return;
    }
    const trimmedValue = editorModel.getValue().trim();
    editorModel.setValue(trimmedValue);
  }, []);

  const editorDidMount = useCallback<NonNullable<KibanaReactCodeEditorProps['editorDidMount']>>(
    (editor) => {
      setEditorCalculatedHeight(editor);

      editor.onDidChangeModelContent(() => {
        setEditorCalculatedHeight(editor);
      });

      editor.onDidBlurEditorWidget(() => {
        trimEditorBlankLines(editor);
      });
    },
    [setEditorCalculatedHeight, trimEditorBlankLines]
  );

  const options: Options = {
    readOnly: isReadOnly,
    lineNumbers: 'off',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    folding: false,
    tabSize: 2,
    scrollbar: {
      alwaysConsumeMouseWheel: false,
    },
    wordWrap: 'on',
    wrappingIndent: 'indent',
  };

  return (
    <KibanaReactCodeEditor
      {...{ onChange, editorDidMount, options, ...props }}
      languageId={type === 'json' ? XJSON_LANG_ID : MARKDOWN_LANG_ID}
      width="100%"
    />
  );
};

/**
 * Renders a Monaco code editor for a setting, deferring mount until it scrolls into view.
 */
export const CodeEditor = (props: CodeEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasBeenVisible = useHasBeenVisible(containerRef);

  return (
    <div ref={containerRef}>
      {hasBeenVisible ? (
        <VisibleCodeEditor {...props} />
      ) : (
        <div aria-hidden={true} style={{ height: getPlaceholderHeight(props.value) }} />
      )}
    </div>
  );
};
