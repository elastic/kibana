/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable-next-line @kbn/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Parser, ParseResult } from '../../ace_migration/types';
import { createParser } from '../parser';

export class ConsoleWorker {
  constructor(private ctx: monaco.worker.IWorkerContext) {}
  private parser: Parser | undefined;

  async parse(modelUri: string): Promise<ParseResult | undefined> {
    if (!this.parser) {
      this.parser = createParser();
    }
    const model = this.ctx.getMirrorModels().find((m) => m.uri.toString() === modelUri);
    if (model) {
      return this.parser(model.getValue());
    }
  }
}
