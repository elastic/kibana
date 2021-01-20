/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { auto } from 'angular';
import { convertDirectiveToRenderFn } from './doc_views_helpers';
import { DocView, DocViewInput, ElasticSearchHit, DocViewInputFn } from './doc_views_types';

export class DocViewsRegistry {
  private docViews: DocView[] = [];
  private angularInjectorGetter: (() => Promise<auto.IInjectorService>) | null = null;

  setAngularInjectorGetter = (injectorGetter: () => Promise<auto.IInjectorService>) => {
    this.angularInjectorGetter = injectorGetter;
  };

  /**
   * Extends and adds the given doc view to the registry array
   */
  addDocView(docViewRaw: DocViewInput | DocViewInputFn) {
    const docView = typeof docViewRaw === 'function' ? docViewRaw() : docViewRaw;
    if (docView.directive) {
      // convert angular directive to render function for backwards compatibility
      docView.render = convertDirectiveToRenderFn(docView.directive, () => {
        if (!this.angularInjectorGetter) {
          throw new Error('Angular was not initialized');
        }
        return this.angularInjectorGetter();
      });
    }
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
