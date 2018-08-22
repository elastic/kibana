/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor, IRange, Uri } from 'monaco-editor';
import ICodeEditor = editor.ICodeEditor;
import { parseLspUri } from '../../common/uri_util';
import { history } from '../utils/url';

interface IResourceInput {
  resource: Uri;
  options?: { selection?: IRange };
}

export class EditorService {
  public openCodeEditor(input: IResourceInput, source: ICodeEditor, sideBySide?: boolean) {
    const uri = input.resource;
    const { repoUri, revision, file } = parseLspUri(uri);
    let newHash = `/${repoUri}/blob/${revision}/${file}`;
    if (input.options && input.options.selection) {
      const { startColumn, startLineNumber } = input.options.selection;
      newHash = newHash + `!L${startLineNumber}:${startColumn}`;
      history.push(newHash);
    }
    return Promise.resolve(source);
  }
}
