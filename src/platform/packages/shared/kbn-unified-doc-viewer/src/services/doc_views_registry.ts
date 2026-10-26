/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocView } from './types';

export enum ElasticRequestState {
  Loading,
  NotFound,
  Found,
  Error,
  NotFoundDataView,
}

const defaultDocViewConfig = {
  enabled: true,
};

export class DocViewsRegistry {
  private docViews: Map<string, DocView>;

  constructor(initialValue?: DocViewsRegistry | DocView[]) {
    if (initialValue instanceof DocViewsRegistry) {
      this.docViews = new Map(initialValue.docViews);
    } else if (Array.isArray(initialValue)) {
      this.docViews = new Map(
        initialValue.map((docView) => [docView.id, this.createDocView(docView)])
      );
    } else {
      this.docViews = new Map();
    }
  }

  getAll() {
    return [...this.docViews.values()];
  }

  add(docView: DocView) {
    if (this.docViews.has(docView.id)) {
      throw new Error(
        `DocViewsRegistry#add: a DocView is already registered with id "${docView.id}".`
      );
    }

    this.docViews.set(docView.id, this.createDocView(docView));
    // Sort the doc views at insertion time to perform this operation once and not on every retrieval.
    this.sortDocViews();
  }

  removeById(id: string) {
    this.docViews.delete(id);
  }

  enableById(id: string) {
    const docView = this.docViews.get(id);
    if (docView) {
      docView.enabled = true;
    } else {
      throw new Error(
        `DocViewsRegistry#enableById: there is no DocView registered with id "${id}".`
      );
    }
  }

  disableById(id: string) {
    const docView = this.docViews.get(id);
    if (docView) {
      docView.enabled = false;
    } else {
      throw new Error(
        `DocViewsRegistry#disableById: there is no DocView registered with id "${id}".`
      );
    }
  }

  clone() {
    return new DocViewsRegistry(this.getAll());
  }

  private sortDocViews() {
    const sortedEntries = [...this.docViews.entries()].sort(
      ([_currKey, curr], [_nextKey, next]) => curr.order - next.order
    );

    this.docViews = new Map(sortedEntries);
  }

  private createDocView(docView: DocView) {
    return { ...defaultDocViewConfig, ...docView };
  }
}
