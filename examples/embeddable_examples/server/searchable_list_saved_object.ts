/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { SavedObjectsType, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
// NOTE: this should rather be imported from 'plugins/kibana_utils/server' but examples at the moment don't
// allow static imports from plugins so this code was duplicated
import { mergeMigrationFunctionMaps } from './merge_migration_function_maps';

export const searchableListSavedObject = (embeddable: EmbeddableSetup) => {
  const searchableListSO: SavedObjectsType = {
    name: 'searchableList',
    hidden: false,
    namespaceType: 'single',
    management: {
      icon: 'visualizeApp',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle(obj: any) {
        return obj.attributes.title;
      },
    },
    mappings: {
      properties: {
        title: { type: 'text' },
        version: { type: 'integer' },
      },
    },
    migrations: () => {
      // there are no migrations defined for the saved object at the moment, possibly they would be added in the future
      const searchableListSavedObjectMigrations = {};

      // we don't know if embeddables have any migrations defined so we need to fetch them and map the received functions so we pass
      // them the correct input and that we correctly map the response
      const embeddableMigrations = mapValues(embeddable.getAllMigrations(), (migrate) => {
        return (state: SavedObjectUnsanitizedDoc) => ({
          ...state,
          attributes: migrate(state.attributes),
        });
      });

      // we merge our and embeddable migrations and return
      return mergeMigrationFunctionMaps(searchableListSavedObjectMigrations, embeddableMigrations);
    },
  };

  return searchableListSO;
};
