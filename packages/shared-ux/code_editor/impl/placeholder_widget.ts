/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';

export class PlaceholderWidget implements monaco.editor.IContentWidget {
  constructor(
    private readonly placeholderText: string,
    private readonly editor: monaco.editor.ICodeEditor
  ) {
    editor.addContentWidget(this);
  }

  private domNode: undefined | HTMLElement;

  public getId(): string {
    return 'KBN_CODE_EDITOR_PLACEHOLDER_WIDGET_ID';
  }

  public getDomNode(): HTMLElement {
    if (!this.domNode) {
      const domNode = document.createElement('div');
      domNode.innerText = this.placeholderText;
      domNode.className = 'kibanaCodeEditor__placeholderContainer';
      this.editor.applyFontInfo(domNode);
      this.domNode = domNode;
    }
    return this.domNode;
  }

  public getPosition(): monaco.editor.IContentWidgetPosition | null {
    return {
      position: {
        column: 1,
        lineNumber: 1,
      },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    };
  }

  public dispose(): void {
    this.editor.removeContentWidget(this);
  }
}
