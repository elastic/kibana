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
import { useDashboardAPI } from '../dashboard_app';

interface EditorMenuProps
  extends Pick<Parameters<typeof useGetDashboardPanels>[0], 'api' | 'createNewVisType'> {
  isDisabled?: boolean;
}

export const EditorMenu = ({ createNewVisType, isDisabled, api }: EditorMenuProps) => {
  const dashboardAPI = useDashboardAPI();

  const {
    overlays,
    analytics,
    settings: { i18n: i18nStart, theme },
  } = pluginServices.getServices();

  const fetchDashboardPanels = useGetDashboardPanels({
    api,
    createNewVisType,
  });

  useEffect(() => {
    // ensure opened dashboard is closed if a navigation event happens;
    return () => {
      dashboardAPI.clearOverlays();
    };
  }, [dashboardAPI]);

  const openDashboardPanelSelectionFlyout = useCallback(
    function openDashboardPanelSelectionFlyout() {
      const flyoutPanelPaddingSize: ComponentProps<
        typeof DashboardPanelSelectionListFlyout
      >['paddingSize'] = 'l';

      const mount = toMountPoint(
        React.createElement(function () {
          return (
            <DashboardPanelSelectionListFlyout
              close={dashboardAPI.clearOverlays}
              {...{
                paddingSize: flyoutPanelPaddingSize,
                fetchDashboardPanels: fetchDashboardPanels.bind(null, dashboardAPI.clearOverlays),
              }}
            />
          );
        }),
        { analytics, theme, i18n: i18nStart }
      );

      dashboardAPI.openOverlay(
        overlays.openFlyout(mount, {
          size: 'm',
          maxWidth: 500,
          paddingSize: flyoutPanelPaddingSize,
          'aria-labelledby': 'addPanelsFlyout',
          'data-test-subj': 'dashboardPanelSelectionFlyout',
          onClose(overlayRef) {
            dashboardAPI.clearOverlays();
            overlayRef.close();
          },
        })
      );
    },
    [analytics, theme, i18nStart, dashboardAPI, overlays, fetchDashboardPanels]
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
