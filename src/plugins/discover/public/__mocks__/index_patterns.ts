/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPatternsService } from '../../../data/common';
import { indexPatternMock } from './index_pattern';

export const indexPatternsMock = ({
  getCache: () => {
    return [indexPatternMock];
  },
  get: (id: string) => {
    if (id === 'the-index-pattern-id') {
      return indexPatternMock;
    }
  },
} as unknown) as IndexPatternsService;
