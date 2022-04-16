/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { SavedObject } from '@kbn/core/server';
import { mergeMigrationFunctionMaps } from '@kbn/kibana-utils-plugin/common';
import { SavedQueryAttributes } from '../../../common';
import { extract, getAllMigrations } from '../../../common/query/persistable_state';

const extractFilterReferences = (doc: SavedObject<SavedQueryAttributes>) => {
  const { state: filters, references } = extract(doc.attributes.filters ?? []);
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      filters,
    },
    references,
  };
};

const filterMigrations = mapValues(getAllMigrations(), (migrate) => {
  return (doc: SavedObject<SavedQueryAttributes>) => ({
    ...doc,
    attributes: {
      ...doc.attributes,
      filters: migrate(doc.attributes.filters),
    },
  });
});

export const savedQueryMigrations = mergeMigrationFunctionMaps(
  {
    '7.16.0': extractFilterReferences,
  },
  filterMigrations
);
