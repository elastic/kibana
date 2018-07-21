/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DocumentSymbolParams,
  Hover,
  SymbolInformation,
  TextDocumentPositionParams,
} from 'vscode-languageserver';

import { LspClient } from './LspClient';
import { LspMethod } from './LspMethod';

export class TextDocumentMethods {
  public documentSymbol: LspMethod<DocumentSymbolParams, SymbolInformation[]>;
  public hover: LspMethod<TextDocumentPositionParams, Hover>;

  private readonly client: LspClient;

  constructor(client: LspClient) {
    this.client = client;
    this.documentSymbol = new LspMethod('textDocument/documentSymbol', this.client);
    this.hover = new LspMethod('textDocument/hover', this.client);
  }
}
