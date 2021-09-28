/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import url from 'url';
import { HttpStart } from 'kibana/public';
import { getGotoPath } from '../../common/short_url_routes';
import { LEGACY_SHORT_URL_LOCATOR_ID } from '../../common/url_service/locators/legacy_short_url_locator';

export async function shortenUrl(
  absoluteUrl: string,
  { basePath, post }: { basePath: string; post: HttpStart['post'] }
) {
  const parsedUrl = url.parse(absoluteUrl);

  if (!parsedUrl || !parsedUrl.path) {
    return;
  }

  const path = parsedUrl.path.replace(basePath, '');
  const hash = parsedUrl.hash ? parsedUrl.hash : '';
  const relativeUrl = path + hash;
  const body = JSON.stringify({
    locatorId: LEGACY_SHORT_URL_LOCATOR_ID,
    params: { url: relativeUrl },
  });

  const resp = await post('/api/short_url', {
    body,
  });

  return url.format({
    protocol: parsedUrl.protocol,
    host: parsedUrl.host,
    pathname: `${basePath}${getGotoPath(resp.id)}`,
  });
}
