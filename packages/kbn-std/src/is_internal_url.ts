/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse as parseUrl } from 'url';

// Used as the dummy base URL for WHATWG URL parser only. We use custom `estc` protocol since it allows us to use empty
// host: https://url.spec.whatwg.org/#empty-host.
export const CUSTOM_BASE_URL = 'estc://';

// The regex to match characters that are automatically removed from the URL by WHATWG URL parser:
// https://infra.spec.whatwg.org/#ascii-tab-or-newline
const TAB_AND_NEW_LINE_REGEX = /[\r\n\t]/g;

/**
 * Determine if url is outside of this Kibana install.
 */
export function isInternalURL(url: string, basePath = '') {
  // First, perform a basic check for the absolute URLs since only such URLs can be parsed without base URL. Also, if
  // the URL cannot be parsed with a custom base URL, then it's not a valid URL, and we should also return `false`.
  // @ts-expect-error `canParse` isn't defined in types yet.
  if (URL.canParse(url) || !URL.canParse(url, CUSTOM_BASE_URL)) {
    return false;
  }

  // Now, let's use the WHATWG URL parser, the one used by browsers, to parse the URL. Since WHATWG URL parser doesn't
  // support parsing relative URLs as is, we have to use a custom base URL with an empty host. If the parsed URL has a
  // non-empty host, then the provided URL is either an absolute or scheme-relative (//) URL.
  const normalizedURL = new URL(url, CUSTOM_BASE_URL);
  if (normalizedURL.host) {
    return false;
  }

  // The fact that we have to use a custom base URL with an empty host doesn't allow us to distinguish proper relative
  // URLs from scheme-relative URLs with an empty host (///), since both of these URLs will be parsed as URLs with an
  // empty host and custom protocol. Due to backward compatibility reasons, browsers can process such URLs in unexpected
  // ways (e.g., browser treat `///abc.com` as just `abc.com`). To account for that, we resort to a legacy Node.js URL
  // parser that will set `hostname` to `null` only if the URL is truly relative. However, unlike the WHATWG URL parser,
  // the Node.js legacy URL parser isn't spec-compliant and doesn't remove tab and newline characters from the URL.
  // Instead, it URL-encodes them, preventing the parser from interpreting scheme-relative URLs and empty hosts as
  // defined in the specification. But since this behavior is clearly defined in the specification, we can safely remove
  // these characters manually to reduce inconsistencies in how Node.js and browsers parse URLs. For more details, see
  // URL specification at https://url.spec.whatwg.org/#concept-basic-url-parser.
  const urlWithoutTabsAndNewlines = url.replace(TAB_AND_NEW_LINE_REGEX, '');
  const { protocol, hostname, port, pathname } = parseUrl(
    urlWithoutTabsAndNewlines,
    false /* parseQueryString */,
    true /* slashesDenoteHost */
  );

  // As explained above, we should explicitly compare `protocol`, `port` and `hostname` to null to make sure these are
  // not detected in the URL at all.
  if (protocol !== null || hostname !== null || port !== null) {
    return false;
  }

  // Now we need to normalize URL to make sure any relative path segments (`..`) cannot escape expected base path.
  if (basePath) {
    return (
      // Normalized pathname can add a leading slash, but we should also make sure it's included in
      // the original URL too
      pathname?.startsWith('/') &&
      (normalizedURL.pathname === basePath || normalizedURL.pathname.startsWith(`${basePath}/`))
    );
  }

  return true;
}
