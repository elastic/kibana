/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import url from 'url';
import { HttpStart } from 'kibana/public';
import { CREATE_PATH, getGotoPath } from '../../common/short_url_routes';

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

  const body = JSON.stringify({ url: relativeUrl });

  const resp = await post(CREATE_PATH, { body });
  return url.format({
    protocol: parsedUrl.protocol,
    host: parsedUrl.host,
    pathname: `${basePath}${getGotoPath(resp.urlId)}`,
  });
}
