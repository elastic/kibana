/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';
import { decompressFromBase64 } from 'lz-string';
import type { RedirectOptions } from './types';

/**
 * Parses redirect endpoint URL path search parameters. Expects them in the
 * following form:
 *
 * ```
 * /r?l=<locator_id>&v=<version>&p=<params>
 * ```
 *
 * @param urlSearch Search part of URL path.
 * @returns Parsed out locator ID, version, and locator params.
 */
export function parseSearchParams<P extends SerializableRecord = unknown & SerializableRecord>(
  urlSearch: string
): RedirectOptions<P> {
  const search = new URLSearchParams(urlSearch);

  const id = search.get('l');
  const version = search.get('v');
  const compressed = search.get('lz');
  const paramsJson: string | null = compressed ? decompressFromBase64(compressed) : search.get('p');

  if (!id) {
    const message = i18n.translate(
      'share.urlService.redirect.RedirectManager.missingParamLocator',
      {
        defaultMessage:
          'Locator ID not specified. Specify "l" search parameter in the URL, which should be an existing locator ID.',
        description:
          'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because of missing locator ID.',
      }
    );
    throw new Error(message);
  }

  if (!version) {
    const message = i18n.translate(
      'share.urlService.redirect.RedirectManager.missingParamVersion',
      {
        defaultMessage:
          'Locator params version not specified. Specify "v" search parameter in the URL, which should be the release version of Kibana when locator params were generated.',
        description:
          'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because of missing version parameter.',
      }
    );
    throw new Error(message);
  }

  if (!paramsJson) {
    const message = i18n.translate('share.urlService.redirect.RedirectManager.missingParamParams', {
      defaultMessage:
        'Locator params not specified. Specify "p" search parameter in the URL, which should be JSON serialized object of locator params.',
      description:
        'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because of missing params parameter.',
    });
    throw new Error(message);
  }

  let params: P;
  try {
    params = JSON.parse(paramsJson);
  } catch {
    const message = i18n.translate('share.urlService.redirect.RedirectManager.invalidParamParams', {
      defaultMessage:
        'Could not parse locator params. Locator params must be serialized as JSON and set at "p" URL search parameter.',
      description:
        'Error displayed to user in redirect endpoint when redirection cannot be performed successfully, because locator parameters could not be parsed as JSON.',
    });
    throw new Error(message);
  }

  return {
    id,
    version,
    params,
  };
}
