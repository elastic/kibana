/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  DataViewsPublicPluginStart,
  DataView,
  DataViewSpec,
} from '@kbn/data-views-plugin/public';

type DataViewCacheKey = `${string}.${string}`;
type AdHocDataViewSpec = Omit<DataViewSpec, 'title'> & { title: string };

export class AdHocDataViewsService {
  private adHocDataViewsCache: Record<DataViewCacheKey, DataView> = {};

  constructor(private readonly dataViews: DataViewsPublicPluginStart) {}

  async create(dataView: AdHocDataViewSpec) {
    const existingDataView = this.getFromCache(dataView);
    if (existingDataView) {
      return existingDataView;
    }

    const adHocDataView = await this.dataViews.create(dataView, false, false);
    this.saveInCache(dataView, adHocDataView);
    return adHocDataView;
  }

  clearAll() {
    Object.values(this.getCache()).forEach(({ id }) => this.dataViews.clearInstanceCache(id));
    this.clearCache();
  }

  private saveInCache(dataViewSpec: AdHocDataViewSpec, dataView: DataView) {
    const key = this.generateKey(dataViewSpec);
    this.adHocDataViewsCache[key] = dataView;
  }

  private getCache() {
    return this.adHocDataViewsCache;
  }

  private clearCache() {
    this.adHocDataViewsCache = {};
  }

  private getFromCache(dataViewSpec: AdHocDataViewSpec) {
    const key = this.generateKey(dataViewSpec);
    return this.getCache()[key];
  }

  private generateKey({ title, timeFieldName }: AdHocDataViewSpec): DataViewCacheKey {
    return `${title}.${timeFieldName ?? ''}`;
  }
}
