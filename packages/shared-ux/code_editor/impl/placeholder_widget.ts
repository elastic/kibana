/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';
import { codeEditorPlaceholderContainerStyles } from './editor.styles';

export interface PlaceholderWidgetProps {
  placeholderText: string;
  editor: monaco.editor.ICodeEditor;
  colors: string;
  widget?: monaco.editor.IContentWidget;
  domNode?: HTMLElement;
}

export const createPlaceholderWidget = ({
  placeholderText,
  editor,
  domNode,
  colors,
}: PlaceholderWidgetProps) => {
  const widget = {
    getDomNode: () => {
      if (!domNode) {
        const setDomNode = document.createElement('div');
        setDomNode.innerText = placeholderText;
        setDomNode.style.cssText += codeEditorPlaceholderContainerStyles(colors);
        editor.applyFontInfo(setDomNode);
        return setDomNode;
      }
      return domNode;
    },
    getPosition: (): monaco.editor.IContentWidgetPosition | null => {
      return {
        position: {
          column: 1,
          lineNumber: 1,
        },
        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
      };
    },
    getId: (): string => {
      return 'KBN_CODE_EDITOR_PLACEHOLDER_WIDGET_ID';
    },
  };

  return widget;
};

export const dispose = ({ editor, widget }: PlaceholderWidgetProps): void => {
  if (!widget) {
    new Error('There is no widget to dispose');
  }
  return editor.removeContentWidget(widget!);
};
