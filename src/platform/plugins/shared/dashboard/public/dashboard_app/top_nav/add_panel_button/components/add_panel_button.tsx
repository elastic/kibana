/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';

import { AddPanelFlyout } from './add_panel_flyout';
import { useDashboardApi } from '../../../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../../../services/kibana_services';

export const AddPanelButton = ({ isDisabled }: { isDisabled?: boolean }) => {
  const dashboardApi = useDashboardApi();

  useEffect(() => {
    // ensure opened overlays are closed if a navigation event happens
    return () => {
      dashboardApi.clearOverlays();
    };
  }, [dashboardApi]);

  const openFlyout = useCallback(() => {
    const overlayRef = coreServices.overlays.openFlyout(
      toMountPoint(
        React.createElement(function () {
          return <AddPanelFlyout dashboardApi={dashboardApi} />;
        }),
        coreServices
      ),
      {
        size: 'm',
        maxWidth: 500,
        paddingSize: 'm',
        'aria-labelledby': 'addPanelsFlyout',
        'data-test-subj': 'dashboardPanelSelectionFlyout',
        onClose() {
          dashboardApi.clearOverlays();
          overlayRef.close();
        },
      }
    );

    dashboardApi.openOverlay(overlayRef);
  }, [dashboardApi]);

  return (
    <ToolbarButton
      data-test-subj="dashboardEditorMenuButton"
      isDisabled={isDisabled}
      iconType="plusInCircle"
      label={i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
        defaultMessage: 'Add panel',
      })}
      onClick={openFlyout}
      size="s"
    />
  );
};
