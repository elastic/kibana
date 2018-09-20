/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor, IRange, Uri } from 'monaco-editor';
import { kfetch } from 'ui/kfetch';
import { ResponseError } from 'vscode-jsonrpc/lib/messages';
import { parseSchema } from '../../common/uri_util';
import { SymbolSearchResult } from '../../model';
import { history } from '../utils/url';
import ICodeEditor = editor.ICodeEditor;

interface IResourceInput {
  resource: Uri;
  options?: { selection?: IRange };
}

export class EditorService {
  public static async handleSymbolUri(qname: string) {
    const result = await EditorService.findSymbolByQname(qname);
    if (result.symbols.length > 0) {
      const symbol = result.symbols[0].symbolInformation;
      const { schema, uri } = parseSchema(symbol.location.uri);
      if (schema === 'git:') {
        const { line, character } = symbol.location.range.start;
        const url = uri + `!L${line + 1}:${character + 1}`;
        history.push(url);
      }
    }
  }

  public static async findSymbolByQname(qname: string) {
    try {
      const response = await kfetch({
        pathname: `/api/lsp/symbol/${qname}`,
        method: 'GET',
      });
      return response as SymbolSearchResult;
    } catch (e) {
      const error = e.body;
      throw new ResponseError<any>(error.code, error.message, error.data);
    }
  }
  public async openCodeEditor(input: IResourceInput, source: ICodeEditor, sideBySide?: boolean) {
    const { scheme, authority, path } = input.resource;
    if (scheme === 'symbol') {
      await EditorService.handleSymbolUri(authority);
    } else {
      const uri = `/${authority}${path}`;
      if (input.options && input.options.selection) {
        const { startColumn, startLineNumber } = input.options.selection;
        const url = uri + `!L${startLineNumber}:${startColumn}`;
        history.push(url);
      }
    }
    return source;
  }
}
