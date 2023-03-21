/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import stringify from 'json-stable-stringify';
import { Sha256 } from '@kbn/crypto-browser';
import { i18n } from '@kbn/i18n';
import { ReactNode } from 'react';
import { BfetchRequestError } from '@kbn/bfetch-plugin/public';
import { ApplicationStart } from '@kbn/core-application-browser';
import { EsError } from '../errors';

export async function createRequestHash(keys: Record<string, any>) {
  return new Sha256().update(stringify(keys), 'utf8').digest('hex');
}

export function getSearchErrorOverrideDisplay({
  error,
  application,
}: {
  error: Error;
  application: ApplicationStart;
}): { title: string; body: ReactNode } | undefined {
  if (error instanceof EsError) {
    return {
      title: i18n.translate('data.search.esErrorTitle', {
        defaultMessage: 'Cannot retrieve search results',
      }),
      body: error.getErrorMessage(application),
    };
  }

  if (error.constructor.name === 'HttpFetchError' || error instanceof BfetchRequestError) {
    const defaultMsg = i18n.translate('data.errors.fetchError', {
      defaultMessage: 'Check your network connection and try again.',
    });

    return {
      title: i18n.translate('data.search.httpErrorTitle', {
        defaultMessage: 'Unable to connect to the Kibana server',
      }),
      body: error.message || defaultMsg,
    };
  }
}
