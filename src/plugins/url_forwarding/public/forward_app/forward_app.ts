/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { App, AppMountParameters, CoreSetup } from '@kbn/core/public';
import { AppNavLinkStatus } from '@kbn/core/public';
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

    const [
      {
        application,
        uiSettings,
        http: { basePath },
      },
    ] = await core.getStartServices();

    const { navigated } = navigateToLegacyKibanaUrl(hash, forwards, basePath, application);
    if (!navigated) {
      const defaultRoute = uiSettings.get<string>('defaultRoute');
      application.navigateToUrl(basePath.prepend(defaultRoute));
    }

    return () => {};
  },
});
