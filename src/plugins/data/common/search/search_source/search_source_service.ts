/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import {
  createSearchSource,
  extractReferences,
  injectReferences,
  SearchSource,
  SearchSourceDependencies,
  SerializedSearchSourceFields,
} from './';
import { IndexPatternsContract } from '../..';
import { mergeMigrationFunctionMaps } from '../../../../kibana_utils/common';
import { getAllMigrations as filtersGetAllMigrations } from '../../query/persistable_state';

export class SearchSourceService {
  public setup() {}

  public start(indexPatterns: IndexPatternsContract, dependencies: SearchSourceDependencies) {
    return {
      /**
       * creates searchsource based on serialized search source fields
       */
      create: createSearchSource(indexPatterns, dependencies),
      /**
       * creates an enpty search source
       */
      createEmpty: () => {
        return new SearchSource({}, dependencies);
      },
      extract: (state: SerializedSearchSourceFields) => {
        const [newState, references] = extractReferences(state);
        return { state: newState, references };
      },
      inject: injectReferences,
      getAllMigrations: () => {
        const searchSourceMigrations = {};

        // we don't know if embeddables have any migrations defined so we need to fetch them and map the received functions so we pass
        // them the correct input and that we correctly map the response
        const filterMigrations = mapValues(filtersGetAllMigrations(), (migrate) => {
          return (state: SerializedSearchSourceFields) => ({
            ...state,
            filter: migrate(state.filter),
          });
        });

        return mergeMigrationFunctionMaps(searchSourceMigrations, filterMigrations);
      },
      telemetry: () => {
        return {};
      },
    };
  }

  public stop() {}
}
