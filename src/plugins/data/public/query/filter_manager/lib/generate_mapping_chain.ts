/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter } from '../../../../common';

const noop = () => {
  throw new Error('No mappings have been found for filter.');
};

export const generateMappingChain = (fn: Function, next: Function = noop) => {
  return (filter: Filter) => {
    try {
      return fn(filter);
    } catch (result) {
      if (result === filter) {
        return next(filter);
      }
      throw result;
    }
  };
};
