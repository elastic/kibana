/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { coreServices } from '../../../services/kibana_services';
import {
  executeCreateTimeSliderControlPanelAction,
  isTimeSliderControlCreationCompatible,
} from '../../../dashboard_actions/execute_create_time_slider_control_panel_action';
import { executeCreateControlPanelAction } from '../../../dashboard_actions/execute_create_control_panel_action';
import { executeCreateESQLControlPanelAction } from '../../../dashboard_actions/execute_create_esql_control_panel_action';
import { executeAddLensPanelAction } from '../../../dashboard_actions/execute_add_lens_panel_action';
import type { DashboardApi } from '../../../dashboard_api/types';
import { addFromLibrary } from '../../../dashboard_renderer/add_panel_from_library';
import { getCreateVisualizationButtonTitle } from '../../_dashboard_app_strings';

interface Props {
  dashboardApi: DashboardApi;
}

export const useDashboardAddItems = ({ dashboardApi }: Props): AppMenuPopoverItem[] => {
  const children = useStateFromPublishingSubject(dashboardApi.children$);
  const [canCreateTimeSlider, setCanCreateTimeSlider] = useState(false);

  useEffect(() => {
    let canceled = false;

    isTimeSliderControlCreationCompatible(dashboardApi).then((next) => {
      if (!canceled) {
        setCanCreateTimeSlider(next);
      }
    });

    return () => {
      canceled = true;
    };
  }, [children, dashboardApi]);

  const openAddPanelFlyout = useCallback(() => {
    openLazyFlyout({
      core: coreServices,
      parentApi: dashboardApi,
      loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
        const { AddPanelFlyout } = await import('../add_panel_button/components/add_panel_flyout');

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
        triggerId: 'dashboardAddTopNavButton',
      },
    });
  }, [dashboardApi]);

  const addMenuItems = useMemo(() => {
    const controlItems: AppMenuPopoverItem[] = [
      {
        id: 'control',
        label: i18n.translate('dashboard.solutionToolbar.addControlButtonLabel', {
          defaultMessage: 'Control',
        }),
        iconType: 'empty',
        order: 1,
        testId: 'controls-create-button',
        run: () => executeCreateControlPanelAction(dashboardApi),
      } as AppMenuPopoverItem,
      {
        id: 'variableControl',
        label: i18n.translate('dashboard.solutionToolbar.addESQLControlButtonLabel', {
          defaultMessage: 'Variable control',
        }),
        iconType: 'empty',
        order: 2,
        testId: 'esql-control-create-button',
        run: () => executeCreateESQLControlPanelAction(dashboardApi),
      } as AppMenuPopoverItem,
      {
        id: 'timeSliderControl',
        label: i18n.translate('dashboard.solutionToolbar.addTimeSliderControlButtonLabel', {
          defaultMessage: 'Time slider control',
        }),
        iconType: 'empty',
        order: 3,
        testId: 'controls-create-timeslider-button',
        disableButton: !canCreateTimeSlider,
        tooltipContent: canCreateTimeSlider
          ? undefined
          : i18n.translate('dashboard.timeSlider.disabledTooltip', {
              defaultMessage: 'Only one time slider control can be added per dashboard.',
            }),
        run: () => executeCreateTimeSliderControlPanelAction(dashboardApi),
      } as AppMenuPopoverItem,
    ];

    return [
      {
        id: 'createVisualization',
        label: getCreateVisualizationButtonTitle(),
        iconType: 'lensApp',
        order: 1,
        testId: 'dashboardCreateNewVisButton',
        run: () => executeAddLensPanelAction(dashboardApi),
      } as AppMenuPopoverItem,
      {
        id: 'newPanel',
        label: i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
          defaultMessage: 'New panel',
        }),
        iconType: 'plusInCircle',
        order: 2,
        testId: 'dashboardOpenAddPanelFlyoutButton',
        run: openAddPanelFlyout,
      } as AppMenuPopoverItem,
      {
        id: 'collapsibleSection',
        label: i18n.translate('dashboard.solutionToolbar.addSectionButtonLabel', {
          defaultMessage: 'Collapsible section',
        }),
        iconType: 'section',
        order: 3,
        testId: 'dashboardAddCollapsibleSectionButton',
        run: () => dashboardApi.addNewSection(),
      } as AppMenuPopoverItem,
      {
        id: 'controls',
        label: i18n.translate('dashboard.solutionToolbar.controlsMenuButtonLabel', {
          defaultMessage: 'Controls',
        }),
        iconType: 'controlsHorizontal',
        order: 4,
        testId: 'dashboard-controls-menu-button',
        items: controlItems,
      } as AppMenuPopoverItem,
      {
        id: 'fromLibrary',
        label: i18n.translate('dashboard.buttonToolbar.buttons.addFromLibrary.libraryButtonLabel', {
          defaultMessage: 'From library',
        }),
        iconType: 'folderOpen',
        order: 5,
        testId: 'dashboardAddFromLibraryButton',
        run: () => addFromLibrary(dashboardApi),
      } as AppMenuPopoverItem,
    ];
  }, [dashboardApi, openAddPanelFlyout, canCreateTimeSlider]);

  return addMenuItems;
};
