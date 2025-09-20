/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';

/**
 * Generates the parameters required for the `multi_terms` field formatter.
 * This is used to format the combined string columns created by `transformEsqlMultiTermBreakdown`.
 *
 * @param {DatatableColumn[]} columns - The columns of the datatable.
 * @returns {object} The parameters for the `multi_terms` field formatter.
 */
export function getMultiTermsFormatterParams(columns: DatatableColumn[]) {
  return {
    paramsPerField: columns
      .filter((c) => c.meta.type === 'string')
      .map((c) => ({
        id: 'terms',
        params: {
          id: 'string',
          missingBucketLabel: i18n.translate('esqlMultiTermTransformer.missingLabel', {
            defaultMessage: '(empty)',
          }),
        },
      })),
  };
}
