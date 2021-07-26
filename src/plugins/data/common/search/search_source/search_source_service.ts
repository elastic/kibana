/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createSearchSource,
  extractReferences,
  injectReferences,
  SearchSource,
  SearchSourceDependencies,
  SearchSourceFields,
} from './';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';
import { PersistableStateService } from '../../../../kibana_utils/common';
import { SavedObjectReference } from '../../../../../core/types';

interface SearchSourceServiceStart extends PersistableStateService {
  createEmpty: () => SearchSource;
  create: (fields?: SearchSourceFields) => Promise<SearchSource>;
}

export class SearchSourceService {
  public setup() {}

  public start(
    indexPatterns: IndexPatternsContract,
    dependencies: SearchSourceDependencies
  ): SearchSourceServiceStart {
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
      // @ts-ignore
      extract: (state: SearchSourceFields) => {
        const results = extractReferences(state);
        return { state: results[0] as SearchSourceFields, references: results[1] };
      },
      // @ts-ignore
      inject: (state: SearchSourceFields, references: SavedObjectReference[]) => {
        // @ts-ignore
        return injectReferences(state, references);
      },
      getAllMigrations: () => {
        return {};
      },
      migrateToLatest: ({ state }) => {
        return state;
      },
    };
  }

  public stop() {}
}
