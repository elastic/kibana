/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createSearchSource, SearchSource, SearchSourceDependencies } from './';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';

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
    };
  }

  public stop() {}
}
