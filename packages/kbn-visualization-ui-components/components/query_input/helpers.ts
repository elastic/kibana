/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewBase, Query } from '@kbn/es-query';
import { toElasticsearchQuery, fromKueryExpression, luceneStringToDsl } from '@kbn/es-query';

export const validateQuery = (input: Query | undefined, dataView: DataViewBase) => {
  let isValid = true;
  let error: string | undefined;

  try {
    if (input) {
      if (input.language === 'kuery') {
        toElasticsearchQuery(fromKueryExpression(input.query), dataView);
      } else {
        luceneStringToDsl(input.query);
      }
    }
  } catch (e) {
    isValid = false;
    error = e.message;
  }

  return { isValid, error };
};

export const isQueryValid = (input: Query, dataView: DataViewBase) =>
  validateQuery(input, dataView).isValid;
