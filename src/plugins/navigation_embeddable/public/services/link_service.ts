/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  cleanEmptyKeys,
  DashboardAppLocatorParams,
  getEmbeddableParams,
} from '@kbn/dashboard-plugin/public';
import { isFilterPinned } from '@kbn/es-query';
import { KibanaLocation } from '@kbn/share-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import { DashboardDrilldownOptions } from '@kbn/presentation-util-plugin/common';

import {
  DASHBOARD_LINK_TYPE,
  NavigationLinkOptions,
  NavigationEmbeddableLink,
  DEFAULT_DASHBOARD_LINK_OPTIONS,
} from '../../common/content_management';
import { type NavigationEmbeddable } from '../embeddable';
import { coreServices, dashboardServices } from './kibana_services';

export const clickLink = async (
  embeddable: NavigationEmbeddable,
  link: NavigationEmbeddableLink & { options: NavigationLinkOptions }
) => {
  if (link.type === DASHBOARD_LINK_TYPE) {
    const params: DashboardAppLocatorParams = {
      dashboardId: link.destination,
      ...getEmbeddableParams(
        embeddable,
        (link.options as DashboardDrilldownOptions) ?? DEFAULT_DASHBOARD_LINK_OPTIONS
      ),
    };

    const locator = dashboardServices.locator; // TODO: Make this a generic locator that is coming from the dashboard container through some sort of getter
    if (locator) {
      const { app, path, state }: KibanaLocation<DashboardAppLocatorParams> =
        await locator.getLocation(params);

      if (link.options.openInNewTab) {
        const url = coreServices.application.getUrlForApp(app, {
          path: setStateToKbnUrl(
            '_a',
            cleanEmptyKeys({
              query: state.query,
              filters: state.filters?.filter((f) => !isFilterPinned(f)),
            }),
            { useHash: false, storeInHashQuery: true },
            path
          ),
          absolute: true,
        });
        window.open(url, '_blank');
      } else {
        await coreServices.application.navigateToApp(app, {
          path,
          state,
        });
      }
    }
  }
};
