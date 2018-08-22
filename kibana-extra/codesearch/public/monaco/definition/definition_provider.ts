/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Monaco } from 'init-monaco';
import { editor, languages } from 'monaco-editor';
import { Definition, Location } from 'vscode-languageserver-types';
import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';
import { parseLspUri } from '../../../common/uri_util';

export function provideDefinition(monaco: Monaco, model: editor.ITextModel, position: any) {
  const lspClient = new LspRestClient('../api/lsp');
  const lspMethods = new TextDocumentMethods(lspClient);
  const { repoUri, file } = parseLspUri(model.uri);
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

  return lspMethods.definition
    .send({
      position: {
        line: position.lineNumber - 1,
        character: position.column - 1,
      },
      textDocument: {
        uri: `git://${repoUri}?HEAD#${file}`,
      },
    })
    .then(
      (definition: Definition) => {
        if (definition) {
          if (Array.isArray(definition)) {
            return definition.map(l => handleLocation(l));
          } else {
            return [handleLocation(definition)];
          }
        } else {
          return [];
        }
      },
      (_: any) => {
        return [];
      }
    );
}
