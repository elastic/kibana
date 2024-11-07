/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pluck } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { Query, AggregateQuery, TimeRange } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { type DataView, textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';

interface TextBasedLanguagesErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export function fetchFieldsFromESQL(
  query: Query | AggregateQuery,
  expressions: ExpressionsStart,
  time?: TimeRange,
  abortController?: AbortController,
  dataView?: DataView
) {
  return textBasedQueryStateToAstWithValidation({
    query,
    time,
    dataView,
  })
    .then((ast) => {
      if (ast) {
        const executionContract = expressions.execute(ast, null);

        if (abortController) {
          abortController.signal.onabort = () => {
            executionContract.cancel();
          };
        }

        const execution = executionContract.getData();
        let finalData: Datatable;
        let error: string | undefined;
        execution.pipe(pluck('result')).subscribe((resp) => {
          const response = resp as Datatable | TextBasedLanguagesErrorResponse;
          if (response.type === 'error') {
            error = response.error.message;
          } else {
            finalData = response;
          }
        });
        return lastValueFrom(execution).then(() => {
          if (error) {
            throw new Error(error);
          } else {
            return finalData;
          }
        });
      }
      return undefined;
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}
