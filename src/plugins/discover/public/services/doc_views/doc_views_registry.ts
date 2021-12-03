/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticSearchHit } from '../../types';
import { DocView, DocViewInput, DocViewInputFn } from './doc_views_types';

export class DocViewsRegistry {
  private docViews: DocView[] = [];

  /**
   * Extends and adds the given doc view to the registry array
   */
  addDocView(docViewRaw: DocViewInput | DocViewInputFn) {
    const docView = typeof docViewRaw === 'function' ? docViewRaw() : docViewRaw;
    if (typeof docView.shouldShow !== 'function') {
      docView.shouldShow = () => true;
    }
    this.docViews.push(docView as DocView);
  }
  /**
   * Returns a sorted array of doc_views for rendering tabs
   */
  getDocViewsSorted(hit: ElasticSearchHit) {
    return this.docViews
      .filter((docView) => docView.shouldShow(hit))
      .sort((a, b) => (Number(a.order) > Number(b.order) ? 1 : -1));
  }
}
