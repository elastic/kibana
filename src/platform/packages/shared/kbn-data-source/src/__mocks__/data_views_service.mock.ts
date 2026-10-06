/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

/** A `DataViewsService` stand-in whose `create` caches by id, like the real service. */
export const createMockDataViewsService = () => {
  const cache = new Map<string, DataView>();
  const fieldFormats = {} as DataView['fieldFormats'];

  const create = jest.fn(async (spec: DataViewSpec) => {
    const id = spec.id as string;
    const cached = cache.get(id);
    if (cached) {
      return cached;
    }
    const dataView = new DataView({ spec: { ...spec, fields: spec.fields ?? {} }, fieldFormats });
    cache.set(id, dataView);
    return dataView;
  });

  const clearInstanceCache = jest.fn((id?: string) => {
    if (id) {
      cache.delete(id);
    } else {
      cache.clear();
    }
  });

  return { create, clearInstanceCache } as unknown as DataViewsPublicPluginStart & {
    create: typeof create;
    clearInstanceCache: typeof clearInstanceCache;
  };
};
