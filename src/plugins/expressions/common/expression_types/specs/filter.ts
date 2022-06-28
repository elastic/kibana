/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';

/**
 * Represents an object that is a Filter.
 */
export type ExpressionValueFilter = ExpressionValueBoxed<
  'filter',
  {
    filterType?: string;
    filterGroup?: string;
    value?: string;
    column?: string;
    and: ExpressionValueFilter[];
    to?: string;
    from?: string;
    query?: string | null;
  }
>;

export const filter: ExpressionTypeDefinition<'filter', ExpressionValueFilter> = {
  name: 'filter',
  from: {
    null: () => {
      return {
        type: 'filter',
        filterType: 'filter',
        // Any meta data you wish to pass along.
        meta: {},
        // And filters. If you need an "or", create a filter type for it.
        and: [],
      };
    },
  },
};
