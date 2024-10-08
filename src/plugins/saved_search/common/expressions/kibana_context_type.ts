/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionValueFilter } from '@kbn/expressions-plugin/common';
import { adaptToExpressionValueFilter, KibanaContext } from '@kbn/data-plugin/common';

export const kibanaContext = {
  name: 'kibana_context',
  from: {
    null: () => {
      return {
        type: 'kibana_context',
      };
    },
  },
  to: {
    null: () => {
      return {
        type: 'null',
      };
    },
    filter: (input: KibanaContext): ExpressionValueFilter => {
      const { filters = [] } = input;
      return {
        type: 'filter',
        filterType: 'filter',
        and: filters.map(adaptToExpressionValueFilter),
      };
    },
  },
};
