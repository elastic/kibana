/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useCallback } from 'react';
import { openLazyFlyout } from '@kbn/presentation-util';
import { i18n } from '@kbn/i18n';

import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
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
    openLazyFlyout({
      core: coreServices,
      parentApi: dashboardApi,
      loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
        const { AddPanelFlyout } = await import('./add_panel_flyout');
        return (
          <AddPanelFlyout
            dashboardApi={dashboardApi}
            closeFlyout={closeFlyout}
            ariaLabelledBy={ariaLabelledBy}
          />
        );
      },
      flyoutProps: {
        'data-test-subj': 'dashboardPanelSelectionFlyout',
      },
      triggerId: 'dashboardEditorMenuButton',
    });
  }, [dashboardApi]);

  return (
    <ToolbarButton
      data-test-subj="dashboardEditorMenuButton"
      id="dashboardEditorMenuButton"
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
