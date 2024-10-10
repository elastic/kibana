/*
 * This file is forked from the react-monaco-editor project (https://github.com/react-monaco-editor/react-monaco-editor),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/shared-ux/code_editor/impl/monaco_editor/LICENSE` for more information.
 */

import { monaco } from '@kbn/monaco';
import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { MonacoEditorProps } from './types';

export function MonacoEditor({
  width = '100%',
  height = '100%',
  value,
  defaultValue = '',
  language = 'javascript',
  theme,
  options,
  editorWillMount,
  editorDidMount,
  editorWillUnmount,
  onChange,
  className,
}: MonacoEditorProps) {
  const containerElement = useRef<HTMLDivElement | null>(null);

  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const _subscription = useRef<monaco.IDisposable | null>(null);

  const __prevent_trigger_change_event = useRef<boolean | null>(null);

  const fixedWidth = processSize(width);

  const fixedHeight = processSize(height);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const style = useMemo(
    () => ({
      width: fixedWidth,
      height: fixedHeight,
    }),
    [fixedWidth, fixedHeight]
  );

  const handleEditorWillMount = () => {
    const finalOptions = editorWillMount?.(monaco);
    return finalOptions || {};
  };

  const handleEditorDidMount = () => {
    editorDidMount?.(editor.current!, monaco);

    _subscription.current = editor.current!.onDidChangeModelContent((event) => {
      if (!__prevent_trigger_change_event.current) {
        onChangeRef.current?.(editor.current!.getValue(), event);
      }
    });
  };

  const handleEditorWillUnmount = () => {
    editorWillUnmount?.(editor.current!, monaco);
  };

  const initMonaco = () => {
    const finalValue = value !== null ? value : defaultValue;

    if (containerElement.current) {
      // Before initializing monaco editor
      const finalOptions = { ...options, ...handleEditorWillMount() };

      const model = monaco.editor.createModel(finalValue!, language);

      editor.current = monaco.editor.create(containerElement.current, {
        model,
        ...(className ? { extraEditorClassName: className } : {}),
        ...finalOptions,
        ...(theme ? { theme } : {}),
      });
      // After initializing monaco editor
      handleEditorDidMount();
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(initMonaco, []);

  // useLayoutEffect instead of useEffect to mitigate https://github.com/facebook/react/issues/31023 in React@18 Legacy Mode
  useLayoutEffect(() => {
    if (editor.current) {
      if (value === editor.current.getValue()) {
        return;
      }

      const model = editor.current.getModel();
      __prevent_trigger_change_event.current = true;
      editor.current.pushUndoStop();
      // pushEditOperations says it expects a cursorComputer, but doesn't seem to need one.
      model!.pushEditOperations(
        [],
        [
          {
            range: model!.getFullModelRange(),
            text: value!,
          },
        ],
        // @ts-expect-error
        undefined
      );
      editor.current.pushUndoStop();
      __prevent_trigger_change_event.current = false;
    }
  }, [value]);

  useEffect(() => {
    if (editor.current) {
      const model = editor.current.getModel();
      monaco.editor.setModelLanguage(model!, language);
    }
  }, [language]);

  useEffect(() => {
    if (editor.current) {
      // Don't pass in the model on update because monaco crashes if we pass the model
      // a second time. See https://github.com/microsoft/monaco-editor/issues/2027
      // @ts-expect-error
      const { model: _model, ...optionsWithoutModel } = options;
      editor.current.updateOptions({
        ...(className ? { extraEditorClassName: className } : {}),
        ...optionsWithoutModel,
      });
    }
  }, [className, options]);

  useEffect(() => {
    if (editor.current) {
      editor.current.layout();
    }
  }, [width, height]);

  useEffect(() => {
    if (theme) {
      monaco.editor.setTheme(theme);
    }
  }, [theme]);

  useEffect(
    () => () => {
      if (editor.current) {
        handleEditorWillUnmount();
        editor.current.dispose();
      }
      if (_subscription.current) {
        _subscription.current.dispose();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <div ref={containerElement} style={style} className="react-monaco-editor-container" />;
}

MonacoEditor.displayName = 'MonacoEditor';

function processSize(size: number | string) {
  return !/^\d+$/.test(size as string) ? size : `${size}px`;
}
