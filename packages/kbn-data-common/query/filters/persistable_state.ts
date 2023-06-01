/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { Filter } from '@kbn/es-query';
import { SavedObjectReference } from '@kbn/core/types';
import { MigrateFunctionsObject, VersionedState } from '@kbn/kibana-utils-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';

export const extract = (filters: Filter[]) => {
  const references: SavedObjectReference[] = [];
  const updatedFilters = filters.map((filter) => {
    if (filter.meta?.index) {
      const id = uuidv4();
      references.push({
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        name: id,
        id: filter.meta.index,
      });

      return {
        ...filter,
        meta: {
          ...filter.meta,
          index: id,
        },
      };
    }
    return filter;
  });
  return { state: updatedFilters, references };
};

export const inject = (filters: Filter[], references: SavedObjectReference[]) => {
  return filters.map((filter) => {
    if (!filter.meta.index) {
      return filter;
    }
    const reference = references.find((ref) => ref.name === filter.meta.index);
    return {
      ...filter,
      meta: {
        ...filter.meta,
        // if no reference has been found, keep the current "index" property (used for adhoc data views)
        index: reference ? reference.id : filter.meta.index,
      },
    };
  });
};

export const telemetry = (filters: Filter[], collector: unknown) => {
  return {};
};

export const migrateToLatest = (filters: VersionedState<Filter[]>) => {
  return filters.state;
};

export const getAllMigrations = (): MigrateFunctionsObject => {
  return {};
};
