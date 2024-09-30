/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ReactNode } from 'react';
import { BfetchRequestError } from '@kbn/bfetch-error';
import { EsError } from './es_error';

export function renderSearchError(
  error: Error
): { title: string; body: ReactNode; actions?: ReactNode[] } | undefined {
  if (error instanceof EsError) {
    return {
      title: i18n.translate('searchErrors.search.esErrorTitle', {
        defaultMessage: 'Cannot retrieve search results',
      }),
      body: error.getErrorMessage(),
      actions: error.getActions(),
    };
  }

  if (error.constructor.name === 'HttpFetchError' || error instanceof BfetchRequestError) {
    const defaultMsg = i18n.translate('searchErrors.errors.fetchError', {
      defaultMessage: 'Check your network connection and try again.',
    });

    return {
      title: i18n.translate('searchErrors.search.httpErrorTitle', {
        defaultMessage: 'Unable to connect to the Kibana server',
      }),
      body: error.message || defaultMsg,
    };
  }
}
