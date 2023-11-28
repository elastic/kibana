/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DocView, DocViewInput, DocViewInputFn } from './types';

export enum ElasticRequestState {
  Loading,
  NotFound,
  Found,
  Error,
  NotFoundDataView,
}

export class DocViewsRegistry {
  private docViews: DocView[] = [];

  /**
   * Extends and adds the given doc view to the registry array
   */
  addDocView(docViewRaw: DocViewInput | DocViewInputFn) {
    const docView = typeof docViewRaw === 'function' ? docViewRaw() : docViewRaw;
    this.docViews.push({
      ...docView,
      shouldShow: docView.shouldShow ?? (() => true),
    });
  }
  /**
   * Returns a sorted array of doc_views for rendering tabs
   */
  getDocViewsSorted(hit: DataTableRecord) {
    return this.docViews
      .filter((docView) => docView.shouldShow(hit))
      .sort((a, b) => (Number(a.order) > Number(b.order) ? 1 : -1));
  }
}
