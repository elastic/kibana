/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { openDashboardFlyout } from '@kbn/presentation-containers';
import { DashboardApi } from '../dashboard_api/types';
import { coreServices } from '../services/kibana_services';
import { htmlIdGenerator } from '@elastic/eui';


const htmlId = htmlIdGenerator('modalTitleId');

export async function addFromLibrary(dashboardApi: DashboardApi) {
  const modalTitleId = htmlId();

  openDashboardFlyout({
    core: coreServices,
    api: dashboardApi,
    loadContent: async ({ closeFlyout })  => {
      const { getAddFromLibraryFlyout } = await import('@kbn/embeddable-plugin/public');

       return await getAddFromLibraryFlyout({
        api: dashboardApi,
        modalTitleId,
        closeFlyout,
      });
    },
    flyoutProps: {
      'data-test-subj': 'dashboardAddPanel',
      'aria-labelledby': modalTitleId,
    },
  });

}
