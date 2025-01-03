/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Determine if url is outside of this Kibana install.
 */
export function isInternalURL(url: string, basePath = '') {
  // We use the WHATWG parser TWICE with completely different dummy base URLs to ensure that the parsed URL always
  // inherits the origin of the base URL. This means that the specified URL isn't an absolute URL, or a scheme-relative
  // URL (//), or a scheme-relative URL with an empty host (///). Browsers may process such URLs unexpectedly due to
  // backward compatibility reasons (e.g., a browser may treat `///abc.com` as just `abc.com`). For more details, refer
  // to https://url.spec.whatwg.org/#concept-basic-url-parser and https://url.spec.whatwg.org/#url-representation.
  let normalizedURL: URL;
  try {
    for (const baseURL of ['http://example.org:5601', 'https://example.com']) {
      normalizedURL = new URL(url, baseURL);
      if (normalizedURL.origin !== baseURL) {
        return false;
      }
    }
  } catch {
    return false;
  }

  // Now we need to normalize URL to make sure any relative path segments (`..`) cannot escape expected base path.
  if (basePath) {
    return (
      // Normalized pathname can add a leading slash, but we should also make sure it's included in
      // the original URL too. We can safely use non-null assertion operator here since we know `normalizedURL` is
      // always defined, otherwise we would have returned `false` already.
      url.startsWith('/') &&
      (normalizedURL!.pathname === basePath || normalizedURL!.pathname.startsWith(`${basePath}/`))
    );
  }

  return true;
}
