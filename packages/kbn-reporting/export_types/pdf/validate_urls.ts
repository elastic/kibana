/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from 'url';
import { filter } from 'lodash';

/*
 * isBogusUrl
 *
 * Besides checking to see if the URL is relative, we also
 * need to verify that window.location.href won't navigate
 * to it, which url.parse doesn't catch all variants of
 */
const isBogusUrl = (url: string) => {
  const { host, protocol, port } = parse(url, false, true);

  return host !== null || protocol !== null || port !== null;
};

export const validateUrls = (urls: string[]): void => {
  if (!Array.isArray(urls)) {
    throw new Error('Invalid relativeUrls. String[] is expected.');
  }
  urls.forEach((url) => {
    if (typeof url !== 'string') {
      throw new Error('Invalid Relative URL in relativeUrls. String is expected.');
    }
  });

  const badUrls = filter(urls, (url) => isBogusUrl(url));

  if (badUrls.length) {
    throw new Error(`Found invalid URL(s), all URLs must be relative: ${badUrls.join(' ')}`);
  }
};
