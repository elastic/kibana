/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndicesGetTemplateResponse } from '@elastic/elasticsearch/lib/api/types';

export class LegacyTemplate {
  constructor(private data: string[] = []) {}
  get = () => {
    return [...this.data];
  };

  load = (data: IndicesGetTemplateResponse = {}) => {
    this.data = Object.keys(data).sort();
  };

  clear = () => {
    this.data = [];
  };
}
