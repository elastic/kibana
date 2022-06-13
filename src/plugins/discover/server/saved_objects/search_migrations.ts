/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: This needs to be removed and properly typed
/* eslint-disable @typescript-eslint/no-explicit-any */
import { flow, get, mapValues } from 'lodash';
import type {
  SavedObjectAttributes,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
} from 'kibana/server';
import { mergeSavedObjectMigrationMaps } from '../../../../core/server';
import { DEFAULT_QUERY_LANGUAGE } from '../../../data/server';
import { MigrateFunctionsObject, MigrateFunction } from '../../../kibana_utils/common';
import type { SerializedSearchSourceFields } from '../../../data/common';

export interface SavedSearchMigrationAttributes extends SavedObjectAttributes {
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
}

/**
 * This migration script is related to:
 *   @link https://github.com/elastic/kibana/pull/62194
 *   @link https://github.com/elastic/kibana/pull/14644
 * This is only a problem when you import an object from 5.x into 6.x but to be sure that all saved objects migrated we should execute it twice in 6.7.2 and 7.9.3
 */
const migrateMatchAllQuery: SavedObjectMigrationFn<any, any> = (doc) => {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');

  if (searchSourceJSON) {
    let searchSource: any;

    try {
      searchSource = JSON.parse(searchSourceJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
      return doc;
    }

    if (searchSource.query?.match_all) {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              ...searchSource,
              query: {
                query: '',
                language: DEFAULT_QUERY_LANGUAGE,
              },
            }),
          },
        },
      };
    }
  }

  return doc;
};

const migrateIndexPattern: SavedObjectMigrationFn<any, any> = (doc) => {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
  if (typeof searchSourceJSON !== 'string') {
    return doc;
  }
  let searchSource;
  try {
    searchSource = JSON.parse(searchSourceJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return doc;
  }

  if (searchSource.index && Array.isArray(doc.references)) {
    searchSource.indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    doc.references.push({
      name: searchSource.indexRefName,
      type: 'index-pattern',
      id: searchSource.index,
    });
    delete searchSource.index;
  }
  if (searchSource.filter) {
    searchSource.filter.forEach((filterRow: any, i: number) => {
      if (!filterRow.meta || !filterRow.meta.index || !Array.isArray(doc.references)) {
        return;
      }
      filterRow.meta.indexRefName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
      doc.references.push({
        name: filterRow.meta.indexRefName,
        type: 'index-pattern',
        id: filterRow.meta.index,
      });
      delete filterRow.meta.index;
    });
  }

  doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);

  return doc;
};

const setNewReferences: SavedObjectMigrationFn<any, any> = (doc, context) => {
  doc.references = doc.references || [];
  // Migrate index pattern
  return migrateIndexPattern(doc, context);
};

const migrateSearchSortToNestedArray: SavedObjectMigrationFn<any, any> = (doc) => {
  const sort = get(doc, 'attributes.sort');
  if (!sort) return doc;

  // Don't do anything if we already have a two dimensional array
  if (Array.isArray(sort) && sort.length > 0 && Array.isArray(sort[0])) {
    return doc;
  }

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      sort: [doc.attributes.sort],
    },
  };
};

/**
 * This creates a migration map that applies search source migrations
 */
const getSearchSourceMigrations = (searchSourceMigrations: MigrateFunctionsObject) =>
  mapValues<MigrateFunctionsObject, MigrateFunction>(
    searchSourceMigrations,
    (migrate: MigrateFunction<SerializedSearchSourceFields>): MigrateFunction =>
      (state) => {
        const _state = state as unknown as { attributes: SavedSearchMigrationAttributes };

        const parsedSearchSourceJSON = _state.attributes.kibanaSavedObjectMeta.searchSourceJSON;

        if (!parsedSearchSourceJSON) return _state;

        return {
          ..._state,
          attributes: {
            ..._state.attributes,
            kibanaSavedObjectMeta: {
              ..._state.attributes.kibanaSavedObjectMeta,
              searchSourceJSON: JSON.stringify(migrate(JSON.parse(parsedSearchSourceJSON))),
            },
          },
        };
      }
  );

export const searchMigrations = {
  '6.7.2': flow(migrateMatchAllQuery),
  '7.0.0': flow(setNewReferences),
  '7.4.0': flow(migrateSearchSortToNestedArray),
  '7.9.3': flow(migrateMatchAllQuery),
};

export const getAllMigrations = (
  searchSourceMigrations: MigrateFunctionsObject
): SavedObjectMigrationMap => {
  return mergeSavedObjectMigrationMaps(
    searchMigrations,
    getSearchSourceMigrations(searchSourceMigrations) as unknown as SavedObjectMigrationMap
  );
};
