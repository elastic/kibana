/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import {
  EsqlDocumentCache,
  type EsqlDocumentsFetch,
  type EsqlDocumentsFetchParams,
} from './documents';
import { EsqlHistogramCache } from './histogram/cache';

export type { EsqlDocumentsFetch } from './documents';

/** Owns the ES|QL results that can survive a Discover route unmount. */
export class EsqlResultCacheService {
  private readonly documents = new EsqlDocumentCache();
  public readonly histogram: EsqlHistogramCache;

  constructor(core: CoreStart) {
    this.histogram = new EsqlHistogramCache(core);
  }

  public manageDocuments(params: EsqlDocumentsFetchParams): EsqlDocumentsFetch {
    return this.documents.manage(params);
  }

  public closeTab(tabId: string) {
    this.documents.disposeTab(tabId);
    this.histogram.disposeTab(tabId);
  }

  public reconcileTabs(openTabIds: readonly string[]) {
    this.histogram.reconcile(openTabIds);
  }

  public dispose() {
    this.documents.dispose();
    this.histogram.dispose();
  }
}
