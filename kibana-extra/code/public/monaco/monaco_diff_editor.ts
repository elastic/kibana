/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor, initMonaco } from 'init-monaco';

export class MonacoDiffEditor {
  public diffEditor: editor.IStandaloneDiffEditor | null = null;
  constructor(
    private readonly container: HTMLElement,
    private readonly originCode: string,
    private readonly modifiedCode: string,
    private readonly language: string,
    private readonly renderSideBySide: boolean
  ) {}

  public init() {
    return new Promise(resolve => {
      initMonaco(monaco => {
        const originalModel = monaco.editor.createModel(this.originCode, this.language);
        const modifiedModel = monaco.editor.createModel(this.modifiedCode, this.language);

        const diffEditor = monaco.editor.createDiffEditor(this.container, {
          enableSplitViewResizing: false,
          renderSideBySide: this.renderSideBySide,
        });
        diffEditor.setModel({
          original: originalModel,
          modified: modifiedModel,
        });
        this.diffEditor = diffEditor;
      });
    });
  }
}
