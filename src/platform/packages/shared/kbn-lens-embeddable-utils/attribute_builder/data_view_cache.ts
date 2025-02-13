/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSpec, DataView } from '@kbn/data-plugin/common';

export const DEFAULT_AD_HOC_DATA_VIEW_ID = 'lens_ad_hoc_default';

export class DataViewCache {
  private static instance: DataViewCache;
  private cache = new Map<string, DataViewSpec>();
  private capacity: number;

  private constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<string, DataViewSpec>();
  }

  public static getInstance(capacity: number = 10): DataViewCache {
    if (!DataViewCache.instance) {
      DataViewCache.instance = new DataViewCache(capacity);
    }
    return DataViewCache.instance;
  }

  public getSpec(dataView: DataView): DataViewSpec {
    const key = dataView.id ?? DEFAULT_AD_HOC_DATA_VIEW_ID;
    const spec = this.cache.get(key);

    if (!spec) {
      const result = dataView.toSpec();
      this.setSpec(key, result);
      return result;
    }

    return spec;
  }

  private setSpec(key: string, value: DataViewSpec): void {
    if (this.cache.size >= this.capacity) {
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }

    this.cache.set(key, value);
  }
}
