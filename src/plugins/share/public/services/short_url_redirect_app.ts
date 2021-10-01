/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'kibana/public';
import { getUrlIdFromGotoRoute, getUrlPath, GOTO_PREFIX } from '../../common/short_url_routes';
import {
  LEGACY_SHORT_URL_LOCATOR_ID,
  LegacyShortUrlLocatorParams,
} from '../../common/url_service/locators/legacy_short_url_locator';
import type { UrlService, ShortUrlData } from '../../common/url_service';

export const createShortUrlRedirectApp = (
  core: CoreSetup,
  location: Location,
  urlService: UrlService
) => ({
  id: 'short_url_redirect',
  appRoute: GOTO_PREFIX,
  chromeless: true,
  title: 'Short URL Redirect',
  async mount() {
    const urlId = getUrlIdFromGotoRoute(location.pathname);
    if (!urlId) throw new Error('Url id not present in path');

    const response = await core.http.get<ShortUrlData>(getUrlPath(urlId));
    const locator = urlService.locators.get(response.locator.id);

    if (!locator) throw new Error(`Locator [id = ${response.locator.id}] not found.`);

    if (response.locator.id !== LEGACY_SHORT_URL_LOCATOR_ID) {
      await locator.navigate(response.locator.state, { replace: true });
      return () => {};
    }

    let redirectUrl = (response.locator.state as LegacyShortUrlLocatorParams).url;
    const storeInSessionStorage = core.uiSettings.get('state:storeInSessionStorage');
    if (storeInSessionStorage) {
      const { hashUrl } = await import('../../../kibana_utils/public');
      redirectUrl = hashUrl(redirectUrl);
    }

    const url = core.http.basePath.prepend(redirectUrl);

    location.href = url;

    return () => {};
  },
});
