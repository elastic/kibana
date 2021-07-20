/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { SavedObjectsType, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { EmbeddableSetup } from '../../../src/plugins/embeddable/server';

export const searchableListSavedObject = (embeddable: EmbeddableSetup) => {
  return {
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
      // we assume all the migration will be done by embeddables service and that saved object holds no extra state besides that of searchable list embeddable input\
      // if saved object would hold additional information we would need to merge the response from embeddables.getAllMigrations with our custom migrations.
      return mapValues(embeddable.getAllMigrations(), (migrate) => {
        return (state: SavedObjectUnsanitizedDoc) => ({
          ...state,
          attributes: migrate(state.attributes),
        });
      });
    },
  } as SavedObjectsType;
};
