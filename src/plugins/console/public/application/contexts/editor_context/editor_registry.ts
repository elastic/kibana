/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MonacoEditorActionsProvider } from '../../containers/editor/monaco/monaco_editor_actions_provider';
import { SenseEditor } from '../../models/sense_editor';

export class EditorRegistry {
  private inputEditor: SenseEditor | MonacoEditorActionsProvider | undefined;

  setInputEditor(inputEditor: SenseEditor | MonacoEditorActionsProvider) {
    this.inputEditor = inputEditor;
  }

  getInputEditor() {
    return this.inputEditor!;
  }
}

// Create a single instance of this and use as private state.
export const instance = new EditorRegistry();
