/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/**
 * A message letting the user know the results that have been retrieved is limited
 * to a certain size.
 * @param resultCount {Number}
 */
export function getLimitedSearchResultsMessage(resultCount) {
  return i18n.translate('discover.docTable.limitedSearchResultLabel', {
    defaultMessage: 'Limited to {resultCount} results. Refine your search.',
    values: { resultCount },
  });
}
