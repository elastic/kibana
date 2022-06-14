/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { SharedUxServicesProvider as LegacyServicesProvider } from '@kbn/shared-ux-services';
export type { SharedUxServices as LegacyServices } from '@kbn/shared-ux-services';

import { SharedUxServices as LegacyServices } from '@kbn/shared-ux-services';
import { KibanaNoDataPageServices } from './services';

/**
 * This list is temporary, a stop-gap as we migrate to a package-based architecture, where
 * services are not collected in a single package.  In order to make the transition, this
 * interface is intentionally "flat".
 *
 * Expect this list to dwindle to zero as `@kbn/shared-ux-components` are migrated to their
 * own packages, (and `@kbn/shared-ux-services` is removed).
 */
export const getLegacyServices = (services: KibanaNoDataPageServices): LegacyServices => ({
  application: {
    currentAppId$: services.currentAppId$,
    navigateToUrl: services.navigateToUrl,
  },
  data: {
    hasESData: services.hasESData,
    hasDataView: services.hasDataView,
    hasUserDataView: services.hasUserDataView,
  },
  docLinks: {
    dataViewsDocLink: services.dataViewsDocLink,
  },
  editors: {
    openDataViewEditor: services.openDataViewEditor,
  },
  http: {
    addBasePath: services.addBasePath,
  },
  permissions: {
    canAccessFleet: services.canAccessFleet,
    canCreateNewDataView: services.canCreateNewDataView,
  },
  platform: {
    setIsFullscreen: services.setIsFullscreen,
  },
});
