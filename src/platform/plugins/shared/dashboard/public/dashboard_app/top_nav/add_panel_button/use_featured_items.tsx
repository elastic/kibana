/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { FEATURED_ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { uiActionsService } from '../../../services/kibana_services';
import type { DashboardApi } from '../../../dashboard_api/types';
import type { MenuItem } from './types';
import { getMenuItems } from './use_menu_item_groups';

export const useFeaturedItems = ({
  dashboardApi,
}: {
  dashboardApi: DashboardApi;
}): { featuredItems: MenuItem[]; loading: boolean } => {
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let canceled = false;
    setLoading(true);

    const context = {
      embeddable: dashboardApi,
      trigger: {
        id: FEATURED_ADD_PANEL_TRIGGER,
      },
    };

    uiActionsService
      .getTriggerCompatibleActions(FEATURED_ADD_PANEL_TRIGGER, context)
      .then((actions) => {
        if (canceled) return;
        setLoading(false);
        setFeaturedItems(getMenuItems(actions, dashboardApi, context));
      })
      .catch((e) => {
        if (!canceled) {
          setLoading(false);
        }
        // eslint-disable-next-line no-console
        console.warn('Unable to load Featured add panel actions, error: ', e);
      });

    return () => {
      canceled = true;
    };
  }, [dashboardApi]);

  return { loading, featuredItems };
};
