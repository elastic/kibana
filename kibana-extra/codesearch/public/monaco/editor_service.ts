/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor, IRange, Uri } from 'monaco-editor';
import { history } from '../utils/url';
import ICodeEditor = editor.ICodeEditor;

interface IResourceInput {
  resource: Uri;
  options?: { selection?: IRange };
}

export class EditorService {
  public openCodeEditor(input: IResourceInput, source: ICodeEditor, sideBySide?: boolean) {
    const uri = input.resource;
    let newHash = `/${uri.authority}${uri.path}/blob/${uri.query}/${uri.fragment}`;
    if (input.options && input.options.selection) {
      const { startColumn, startLineNumber } = input.options.selection;
      newHash = newHash + `!L${startLineNumber}:${startColumn}`;
      history.push(newHash);
    }
    return Promise.resolve(source);
  }
}
