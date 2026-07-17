/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FEATURED_ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { uiActionsService } from '../../../services/kibana_services';
import type { DashboardApi } from '../../../dashboard_api/types';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  type OpenDashboardChatActionContext,
} from '../../../dashboard_renderer/viewport/empty_screen/dashboard_empty_screen_chat_action';
import type { AddPanelActionExtension, MenuItem } from './types';
import { getMenuItems } from './use_menu_item_groups';

type FeaturedAddPanelAction = Action<object, AddPanelActionExtension>;

/**
 * Featured-card copy for known panel actions. Overrides action display names / tooltips.
 */
const featuredItemCopy: Record<string, Partial<Pick<MenuItem, 'name' | 'description'>>> = {
  addLensPanelAction: {
    name: i18n.translate('dashboard.featuredItems.createVisualizationTitle', {
      defaultMessage: 'Create visualization',
    }),
    description: i18n.translate('dashboard.featuredItems.createVisualizationDescription', {
      defaultMessage: 'Point-and-click editor',
    }),
  },
  ACTION_CREATE_ESQL_CHART: {
    name: i18n.translate('dashboard.featuredItems.createEsqlVisualizationTitle', {
      defaultMessage: 'Create visualization (with query)',
    }),
    description: i18n.translate('dashboard.featuredItems.createEsqlVisualizationDescription', {
      defaultMessage: 'ES|QL editor',
    }),
  },
};

const applyFeaturedItemCopy = (items: MenuItem[]): MenuItem[] =>
  items.map((item) => {
    const copy = featuredItemCopy[item.id];
    return copy ? { ...item, ...copy } : item;
  });

export const useFeaturedItems = ({
  dashboardApi,
  includeOpenDashboardChat = false,
}: {
  dashboardApi: DashboardApi;
  /**
   * When true, includes the registered open-dashboard-chat action among featured items.
   * Used by the add-panel flyout; the empty screen renders Chat separately.
   */
  includeOpenDashboardChat?: boolean;
}): { featuredItems: MenuItem[]; loading: boolean } => {
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    setLoading(true);

    const context = {
      embeddable: dashboardApi,
      trigger: {
        id: FEATURED_ADD_PANEL_TRIGGER,
      },
    };

    const loadFeaturedItems = async () => {
      try {
        const actions = (await uiActionsService.getTriggerCompatibleActions(
          FEATURED_ADD_PANEL_TRIGGER,
          context
        )) as FeaturedAddPanelAction[];

        const menuItems = applyFeaturedItemCopy(getMenuItems(actions, dashboardApi, context));

        if (includeOpenDashboardChat && uiActionsService.hasAction(OPEN_DASHBOARD_CHAT_ACTION_ID)) {
          try {
            const chatAction = (await uiActionsService.getAction(
              OPEN_DASHBOARD_CHAT_ACTION_ID
            )) as Action<OpenDashboardChatActionContext, AddPanelActionExtension>;
            const compatible = await chatAction.isCompatible({
              ...context,
              trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
            });

            if (compatible) {
              menuItems.unshift(
                ...getMenuItems([chatAction as FeaturedAddPanelAction], dashboardApi, context)
              );
            }
          } catch {
            // An unavailable Chat action should not block featured panel items.
          }
        }

        if (!canceled) {
          setFeaturedItems(menuItems);
          setLoading(false);
        }
      } catch (e) {
        if (!canceled) {
          setLoading(false);
        }
        // eslint-disable-next-line no-console
        console.warn('Unable to load Featured add panel actions, error: ', e);
      }
    };

    loadFeaturedItems();

    return () => {
      canceled = true;
    };
  }, [dashboardApi, includeOpenDashboardChat]);

  return { loading, featuredItems };
};
