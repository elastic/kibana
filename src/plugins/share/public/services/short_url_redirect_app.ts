/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup } from 'kibana/public';
import { getUrlIdFromGotoRoute, getUrlPath, GOTO_PREFIX } from '../../common/short_url_routes';

export const createShortUrlRedirectApp = (core: CoreSetup, location: Location) => ({
  id: 'short_url_redirect',
  appRoute: GOTO_PREFIX,
  chromeless: true,
  title: 'Short URL Redirect',
  async mount() {
    const urlId = getUrlIdFromGotoRoute(location.pathname);

    if (!urlId) {
      throw new Error('Url id not present in path');
    }

    const response = await core.http.get<{ url: string }>(getUrlPath(urlId));
    const redirectUrl = response.url;
    const { hashUrl } = await import('../../../kibana_utils/public');
    const hashedUrl = hashUrl(redirectUrl);
    const url = core.http.basePath.prepend(hashedUrl);

    location.href = url;

    return () => {};
  },
});
