/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { STACK_ACCESSORS, STACKED_OPTIONS } from '../../../constants';

export const getStackAccessors = (stack) => {
  switch (stack) {
    case STACKED_OPTIONS.STACKED:
    case STACKED_OPTIONS.STACKED_WITHIN_SERIES:
    case STACKED_OPTIONS.PERCENT:
      return STACK_ACCESSORS;
    default:
      return undefined;
  }
};
