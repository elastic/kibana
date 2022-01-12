/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';

import type { monaco } from '@kbn/monaco';
import usePrevious from 'react-use/lib/usePrevious';

import { CodeEditor } from '../../../../kibana_react/public';

import { ExpressionInputProps } from '../types';
import { EXPRESSIONS_LANGUAGE_ID } from '../../../common';
import { CODE_EDITOR_OPTIONS, LANGUAGE_CONFIGURATION } from './constants';
import { getHoverProvider, getSuggestionProvider } from './providers';

/**
 * An input component that can provide suggestions and hover information for an Expression
 * as it is being written.  Be certain to provide ExpressionFunctions by calling `registerExpressionFunctions`
 * from the start contract of the presentationUtil plugin.
 */
export const ExpressionInput = (props: ExpressionInputProps) => {
  const {
    expressionFunctions,
    expression: initialExpression,
    onChange: onChangeProp,
    isCompact,
    height,
    style,
    editorRef,
    ...rest
  } = props;
  const [expression, setExpression] = useState(initialExpression);
  const prevExpression = usePrevious(initialExpression);

  useEffect(() => {
    if (prevExpression !== initialExpression) {
      setExpression(initialExpression);
    }
  }, [prevExpression, initialExpression]);

  const suggestionProvider = useMemo(
    () => getSuggestionProvider(expressionFunctions),
    [expressionFunctions]
  );
  const hoverProvider = useMemo(() => getHoverProvider(expressionFunctions), [expressionFunctions]);

  // Updating tab size for the editor
  const editorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    model?.updateOptions({ tabSize: 2 });

    if (editorRef) {
      editorRef.current = editor;
    }
  };

  const setValue = debounce((value: string) => setExpression(value), 500, {
    leading: true,
    trailing: false,
  });

  const onChange = (value: string) => {
    setValue(value);
    onChangeProp(value);
  };

  return (
    <div style={{ height, ...style }} {...{ rest }}>
      <CodeEditor
        languageId={EXPRESSIONS_LANGUAGE_ID}
        languageConfiguration={LANGUAGE_CONFIGURATION}
        value={expression}
        onChange={onChange}
        suggestionProvider={suggestionProvider}
        hoverProvider={hoverProvider}
        options={{
          ...CODE_EDITOR_OPTIONS,
          fontSize: isCompact ? 12 : 16,
        }}
        editorDidMount={editorDidMount}
      />
    </div>
  );
};
