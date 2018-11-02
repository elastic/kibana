/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SymbolLocator } from '@code/lsp-extension';
import { Monaco } from 'init-monaco';
import { editor, languages } from 'monaco-editor';
import { Location } from 'vscode-languageserver-types';
import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';

export function provideDefinition(monaco: Monaco, model: editor.ITextModel, position: any) {
  const lspClient = new LspRestClient('../api/lsp');
  const lspMethods = new TextDocumentMethods(lspClient);
  function handleLocation(location: Location): languages.Location {
    return {
      uri: monaco.Uri.parse(location.uri),
      range: {
        startLineNumber: location.range.start.line + 1,
        startColumn: location.range.start.character + 1,
        endLineNumber: location.range.end.line + 1,
        endColumn: location.range.end.character + 1,
      },
    };
  }

  return lspMethods.edefinition
    .send({
      position: {
        line: position.lineNumber - 1,
        character: position.column - 1,
      },
      textDocument: {
        uri: model.uri.toString(),
      },
    })
    .then(
      (result: SymbolLocator[]) => {
        if (result) {
          return result.filter(l => l.location !== undefined).map(l => handleLocation(l.location!));
        } else {
          return [];
        }
      },
      (_: any) => {
        return [];
      }
    );
}
