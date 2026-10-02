/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

interface CreateMockDataViewsServiceOptions {
  /** What the field caps API returns for any pattern. */
  fieldCapsFields?: Record<string, FieldSpec>;
  /** Makes the field caps API fail, as it does for views and external datasets. */
  fieldCapsThrows?: boolean;
}

/**
 * A `DataViewsService` stand-in with the behavior the ES|QL shim relies on: `create` caches
 * by id, fetches fields from the mocked field caps API unless `skipFetchFields` is set, and
 * fetches again for a cached DataView that has no fields.
 */
export const createMockDataViewsService = ({
  fieldCapsFields = {},
  fieldCapsThrows = false,
}: CreateMockDataViewsServiceOptions = {}) => {
  const cache = new Map<string, DataView>();
  const fieldFormats = {} as DataView['fieldFormats'];

  const fetchFields = (dataView: DataView) => {
    if (fieldCapsThrows) {
      throw new Error('field caps are not available for this source');
    }
    dataView.fields.replaceAll(Object.values(fieldCapsFields));
  };

  const create = jest.fn(async (spec: DataViewSpec, skipFetchFields = false) => {
    const id = spec.id as string;
    const cached = cache.get(id);
    if (cached) {
      if (!skipFetchFields && cached.fields.length === 0) {
        fetchFields(cached);
      }
      return cached;
    }
    const dataView = new DataView({
      spec: { ...spec, fields: skipFetchFields ? spec.fields ?? {} : {} },
      fieldFormats,
    });
    if (!skipFetchFields) {
      fetchFields(dataView);
    }
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
