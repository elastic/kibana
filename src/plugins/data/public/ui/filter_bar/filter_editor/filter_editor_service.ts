/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filterOperatorRegistry, Operator } from './filter_operator_registry';

/**
 * Filter Editor Service
 *
 * @internal
 */
export class FilterEditorService {
  public setup() {
    return {
      /**
       * registers a filter operator
       * filter operator is used by filter editor to provide specific UI per registed filter type.
       * @param {Operator} newOperator - operator definition
       */
      registerFilterOperator: filterOperatorRegistry.add,
    };
  }

  public start() {
    // nothing to do here yet
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public types */
export { Operator };
export type FilterEditorSetup = ReturnType<FilterEditorService['setup']>;
