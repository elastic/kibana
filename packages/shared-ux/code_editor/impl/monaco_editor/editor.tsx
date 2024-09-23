/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { MonacoEditorProps } from './types';

function processSize(size: number | string) {
  return !/^\d+$/.test(size as string) ? size : `${size}px`;
}

export function MonacoEditor({
  width = '100%',
  height = '100%',
  value,
  defaultValue = '',
  language = 'javascript',
  theme,
  options,
  overrideServices,
  editorWillMount,
  editorDidMount,
  editorWillUnmount,
  onChange,
  className,
  uri,
}: MonacoEditorProps) {
  const containerElement = useRef<HTMLDivElement | null>(null);

  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const _subscription = useRef<monaco.IDisposable | null>(null);

  const __prevent_trigger_change_event = useRef<boolean | null>(null);

  const fixedWidth = processSize(width);

  const fixedHeight = processSize(height);

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
        onChange?.(editor.current!.getValue(), event);
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
      const modelUri = uri?.(monaco);
      let model = modelUri && monaco.editor.getModel(modelUri);
      if (model) {
        // Cannot create two models with the same URI,
        // if model with the given URI is already created, just update it.
        model.setValue(finalValue!);
        monaco.editor.setModelLanguage(model, language);
      } else {
        model = monaco.editor.createModel(finalValue!, language, modelUri);
      }
      editor.current = monaco.editor.create(
        containerElement.current,
        {
          model,
          ...(className ? { extraEditorClassName: className } : {}),
          ...finalOptions,
          ...(theme ? { theme } : {}),
        },
        overrideServices
      );
      // After initializing monaco editor
      handleEditorDidMount();
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(initMonaco, []);

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

        const model = editor.current.getModel();
        if (model) {
          model.dispose();
        }
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
