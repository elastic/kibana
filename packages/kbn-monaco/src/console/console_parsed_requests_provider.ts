/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConsoleWorkerProxyService } from './console_worker_proxy';
import { ParsedRequest } from './types';
import { monaco } from '../monaco_imports';

/*
 * This class is a helper interface that is used in the Console plugin.
 * The provider access the Console parser that runs in a web worker and analyzes the editor input
 * when it changes.
 * The parsed result contains the requests and errors which are used in the Console plugin.
 */
export class ConsoleParsedRequestsProvider {
  constructor(
    private workerProxyService: ConsoleWorkerProxyService,
    private model: monaco.editor.ITextModel | null
  ) {}
  public async getRequests(): Promise<ParsedRequest[]> {
    if (!this.model) {
      return [];
    }
    const parserResult = await this.workerProxyService.getParserResult(this.model.uri);
    return parserResult?.requests ?? [];
  }
}
