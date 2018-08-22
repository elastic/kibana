/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { editor } from 'monaco-editor';
import { EditorActions } from '../../components/editor/editor';
import ICodeEditor = editor.ICodeEditor;

export function registerReferencesAction(
  e: editor.IStandaloneCodeEditor,
  editorActions: EditorActions
) {
  e.addAction({
    id: 'editor.action.referenceSearch.trigger',
    label: 'Find All References',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run(ed: ICodeEditor) {
      const position = ed.getPosition();
      const uri = ed.getModel().uri;
      editorActions.findReferences({
        textDocument: {
          uri: uri.toString(),
        },
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
      });
    },
  });
}
