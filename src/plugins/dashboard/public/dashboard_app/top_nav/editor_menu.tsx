/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './editor_menu.scss';

import React, { useEffect, useCallback, type ComponentProps } from 'react';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';

import { useGetDashboardPanels, DashboardPanelSelectionListFlyout } from './add_new_panel';
import { pluginServices } from '../../services/plugin_services';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';

interface EditorMenuProps
  extends Pick<Parameters<typeof useGetDashboardPanels>[0], 'createNewVisType'> {
  isDisabled?: boolean;
}

export const EditorMenu = ({ createNewVisType, isDisabled }: EditorMenuProps) => {
  const dashboardApi = useDashboardApi();

  const {
    overlays,
    analytics,
    settings: { i18n: i18nStart, theme },
  } = pluginServices.getServices();

  const fetchDashboardPanels = useGetDashboardPanels({
    api: dashboardApi,
    createNewVisType,
  });

  useEffect(() => {
    // ensure opened dashboard is closed if a navigation event happens;
    return () => {
      dashboardApi.clearOverlays();
    };
  }, [dashboardApi]);

  const openDashboardPanelSelectionFlyout = useCallback(
    function openDashboardPanelSelectionFlyout() {
      const flyoutPanelPaddingSize: ComponentProps<
        typeof DashboardPanelSelectionListFlyout
      >['paddingSize'] = 'l';

      const mount = toMountPoint(
        React.createElement(function () {
          return (
            <DashboardPanelSelectionListFlyout
              close={dashboardApi.clearOverlays}
              {...{
                paddingSize: flyoutPanelPaddingSize,
                fetchDashboardPanels: fetchDashboardPanels.bind(null, dashboardApi.clearOverlays),
              }}
            />
          );
        }),
        { analytics, theme, i18n: i18nStart }
      );

      dashboardApi.openOverlay(
        overlays.openFlyout(mount, {
          size: 'm',
          maxWidth: 500,
          paddingSize: flyoutPanelPaddingSize,
          'aria-labelledby': 'addPanelsFlyout',
          'data-test-subj': 'dashboardPanelSelectionFlyout',
          onClose(overlayRef) {
            dashboardApi.clearOverlays();
            overlayRef.close();
          },
        })
      );
    },
    [analytics, theme, i18nStart, dashboardApi, overlays, fetchDashboardPanels]
  );

  return (
    <ToolbarButton
      data-test-subj="dashboardEditorMenuButton"
      isDisabled={isDisabled}
      iconType="plusInCircle"
      label={i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
        defaultMessage: 'Add panel',
      })}
      onClick={openDashboardPanelSelectionFlyout}
      size="s"
    />
  );
};
