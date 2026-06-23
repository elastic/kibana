/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiContextMenu } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SideNavItemActionMenuRenderProps } from '@kbn/core-chrome-browser';

import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { dashboardClient } from '../dashboard_client';
import { dashboardListingErrorStrings } from '../dashboard_listing/_dashboard_listing_strings';
import { coreServices } from '../services/kibana_services';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';
import { createDashboardEditUrl } from '../utils/urls';
import { createDashboardFavoritesClient } from './fetch_starred_dashboards';

export const DASHBOARDS_ITEM_ACTION_MENU_ID = 'dashboards_item_actions';

export const DashboardItemActionMenu = ({
  context,
  onClose,
}: SideNavItemActionMenuRenderProps): JSX.Element => {
  const dashboardId = context.dashboardId;
  const section = context.section;
  const title = context.title;
  const { showWriteControls } = getDashboardCapabilities();

  const panels = useMemo(() => {
    const items = [
      {
        name: i18n.translate('dashboard.nav.editDashboard', {
          defaultMessage: 'Edit',
        }),
        icon: 'pencil' as const,
        onClick: () => {
          coreServices.application.navigateToApp(DASHBOARD_APP_ID, {
            path: `#${createDashboardEditUrl(dashboardId)}`,
          });
          onClose();
        },
      },
      section === 'starred'
        ? {
            name: i18n.translate('dashboard.nav.removeFromStarred', {
              defaultMessage: 'Remove from starred',
            }),
            icon: 'starEmpty' as const,
            onClick: () => {
              void createDashboardFavoritesClient(coreServices)
                .removeFavorite({ id: dashboardId })
                .finally(onClose);
            },
          }
        : {
            name: i18n.translate('dashboard.nav.addToStarred', {
              defaultMessage: 'Star',
            }),
            icon: 'starEmpty' as const,
            onClick: () => {
              void createDashboardFavoritesClient(coreServices)
                .addFavorite({ id: dashboardId })
                .finally(onClose);
            },
          },
    ];

    if (showWriteControls) {
      items.push(
        { isSeparator: true },
        {
          name: i18n.translate('dashboard.nav.deleteDashboard', {
            defaultMessage: 'Delete',
          }),
          icon: 'trash' as const,
          color: 'danger' as const,
          onClick: () => {
            onClose();
            void coreServices.overlays
              .openConfirm(
                i18n.translate('dashboard.nav.deleteDashboardConfirm', {
                  defaultMessage: 'Delete "{title}"?',
                  values: { title },
                }),
                {
                  title: i18n.translate('dashboard.nav.deleteDashboardConfirmTitle', {
                    defaultMessage: 'Delete dashboard',
                  }),
                  confirmButtonText: i18n.translate('dashboard.nav.deleteDashboardConfirmButton', {
                    defaultMessage: 'Delete',
                  }),
                  buttonColor: 'danger',
                }
              )
              .then(async (confirmed) => {
                if (!confirmed) {
                  return;
                }

                try {
                  await dashboardClient.delete(dashboardId);
                } catch (error) {
                  coreServices.notifications.toasts.addError(error, {
                    title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
                  });
                }
              });
          },
        }
      );
    }

    return [{ id: 0, items }];
  }, [dashboardId, onClose, section, showWriteControls, title]);

  return <EuiContextMenu initialPanelId={0} panels={panels} size="s" />;
};
