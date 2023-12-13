/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const SEARCH_INDEX_SUFFIX = `-search-index`;

export class SearchIndexNames {
  public readonly base: string;
  public readonly index: string;
  public readonly indexPattern: string;
  public readonly indexTemplate: string;

  constructor(baseName: string) {
    const index = `${baseName}${SEARCH_INDEX_SUFFIX}`;

    this.base = baseName;
    this.index = index;
    this.indexPattern = `${index}*`;
    this.indexTemplate = `${index}-template`;
  }
}
