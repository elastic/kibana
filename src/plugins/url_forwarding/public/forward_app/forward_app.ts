/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { App, AppMountParameters, CoreSetup } from 'kibana/public';
import { AppNavLinkStatus } from '../../../../core/public';
import { navigateToLegacyKibanaUrl } from './navigate_to_legacy_kibana_url';
import { ForwardDefinition, UrlForwardingStart } from '../plugin';

export const createLegacyUrlForwardApp = (
  core: CoreSetup<{}, UrlForwardingStart>,
  forwards: ForwardDefinition[]
): App => ({
  id: 'kibana',
  chromeless: true,
  title: 'Legacy URL migration',
  appRoute: '/app/kibana#/',
  navLinkStatus: AppNavLinkStatus.hidden,
  async mount(params: AppMountParameters) {
    const hash = params.history.location.hash.substr(1);

    if (!hash) {
      const [, , kibanaLegacyStart] = await core.getStartServices();
      kibanaLegacyStart.navigateToDefaultApp();
    }

    const [
      {
        application,
        http: { basePath },
      },
    ] = await core.getStartServices();

    const result = await navigateToLegacyKibanaUrl(hash, forwards, basePath, application);

    if (!result.navigated) {
      const [, , kibanaLegacyStart] = await core.getStartServices();
      kibanaLegacyStart.navigateToDefaultApp();
    }

    return () => {};
  },
});
