/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { isFilterPinned } from '@kbn/es-query';
import type { DrilldownDefinition } from '@kbn/embeddable-plugin/public/drilldowns/types';
import type { DashboardDrilldownState } from '../../server/dashboard_drilldown/types';
import { coreServices } from '../services/kibana_services';
import { getLocation } from './get_location';
import { cleanEmptyKeys } from '../../common/locator/locator';
import {
  DASHBOARD_DRILLDOWN_SUPPORTED_TRIGGERS,
  DEFAULT_DASHBOARD_NAVIGATION_OPTIONS,
} from '../../common/page_bundle_constants';
import { DashboardDrilldownEditor } from './editor';

export const dashboardDrilldown: DrilldownDefinition<
  DashboardDrilldownState,
  ApplyGlobalFilterActionContext
> = {
  displayName: i18n.translate('dashboard.drilldown.goToDashboard', {
    defaultMessage: 'Go to Dashboard',
  }),
  euiIcon: 'dashboardApp',
  supportedTriggers: DASHBOARD_DRILLDOWN_SUPPORTED_TRIGGERS,
  action: {
    execute: async (
      drilldownState: DashboardDrilldownState,
      context: ApplyGlobalFilterActionContext
    ) => {
      if (drilldownState.open_in_new_tab) {
        window.open(await getHref(drilldownState, context), '_blank');
      } else {
        const { app, path, state } = await getLocation(drilldownState, context);
        await coreServices.application.navigateToApp(app, { path, state });
      }
    },
    getHref,
  },
  setup: {
    Editor: DashboardDrilldownEditor,
    getInitialState: () => ({
      ...DEFAULT_DASHBOARD_NAVIGATION_OPTIONS,
    }),
    isStateValid: (state: Partial<DashboardDrilldownState>) => {
      return Boolean(state.dashboard_id);
    },
    order: 100,
  },
};

async function getHref(
  drilldownState: DashboardDrilldownState,
  context: ApplyGlobalFilterActionContext
) {
  const { app, path, state } = await getLocation(drilldownState, context);
  const url = await coreServices.application.getUrlForApp(app, {
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
  return url;
}
