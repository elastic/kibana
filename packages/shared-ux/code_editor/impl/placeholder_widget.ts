/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';
import { useState } from 'react';

interface Props {
  placeholder: string;
  editor: monaco.editor.ICodeEditor;
}

/**
 * Creates a space for a widget alongside the code editor
 */
export const PlaceholderWidget = (props: Props) => {
  const [placeholderText, setPlaceholderText] = useState('');
  const [editor, setEditor] = useState();

  const getDomNode = (domNode: undefined | HTMLElement): HTMLElement => {
    if (!domNode) {
      let domNode = document.createElement('div');
      setPlaceholderText(domNode.innerText);
      domNode.className = 'kibanaCodeEditor__placeholderContainer';
      setEditor.applyFontInfo(domNode);
      domNode = domNode;
    }
    return domNode;
  };
};

export const getId = (): string => {
  return 'KBN_CODE_EDITOR_PLACEHOLDER_WIDGET_ID';
};

export const getPosition = (): monaco.editor.IContentWidgetPosition | null => {
  return {
    position: {
      column: 1,
      lineNumber: 1,
    },
    preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
  };
};

export const dispose = (
  editor: monaco.editor.ICodeEditor,
  placeholderWidget: monaco.editor.IContentWidget
): void => {
  editor.removeContentWidget(placeholderWidget);
};
