/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '../../../../core/public';
import type { App, AppMountParameters } from '../../../../core/public/application/types';
import { AppNavLinkStatus } from '../../../../core/public/application/types';
import type { ForwardDefinition, UrlForwardingStart } from '../plugin';
import { navigateToLegacyKibanaUrl } from './navigate_to_legacy_kibana_url';

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
