/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SenseEditor } from '../../models/sense_editor';

export class EditorRegistry {
  private inputEditor: SenseEditor | undefined;

  setInputEditor(inputEditor: SenseEditor) {
    this.inputEditor = inputEditor;
  }

  getInputEditor() {
    return this.inputEditor!;
  }
}

// Create a single instance of this and use as private state.
export const instance = new EditorRegistry();
