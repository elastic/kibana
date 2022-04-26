/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { lastValueFrom } from 'rxjs';
import { DataPublicPluginStart } from '../../../data/public';
import { VisSearchContext } from '../types';

export interface VisTypeScriptKibanaApiDeps {
  data: DataPublicPluginStart;
}

export interface SearchOptions {
  useKibanaContext: boolean;
}

export class VisTypeScriptKibanaApi {
  constructor(
    private readonly deps: VisTypeScriptKibanaApiDeps,
    private readonly visSearchContext: VisSearchContext
  ) {}

  async esSearch(
    payload: estypes.SearchRequest,
    { useKibanaContext = true }: SearchOptions = { useKibanaContext: true }
  ): Promise<estypes.SearchResponse> {
    if (useKibanaContext) {
      // TODO: adjust request based on this.visSearchContext
      // eslint-disable-next-line no-console
      console.log(this.visSearchContext);
    }

    const response = await lastValueFrom(this.deps.data.search.search({ params: payload }));
    return response.rawResponse;
  }
}
