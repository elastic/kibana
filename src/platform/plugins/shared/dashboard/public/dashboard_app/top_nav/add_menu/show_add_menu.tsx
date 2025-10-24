/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';

import {
  EuiContextMenu,
  EuiWrappingPopover,
  type EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { openLazyFlyout } from '@kbn/presentation-util';
import { executeCreateTimeSliderControlPanelAction } from '../../../dashboard_actions/execute_create_time_slider_control_panel_action';
import { executeCreateESQLControlPanelAction } from '../../../dashboard_actions/execute_create_esql_control_panel_action copy';
import { executeCreateControlPanelAction } from '../../../dashboard_actions/execute_create_control_panel_action copy 2';
import { executeAddLensPanelAction } from '../../../dashboard_actions/execute_add_lens_panel_action';
import type { DashboardApi } from '../../../dashboard_api/types';
import { addFromLibrary } from '../../../dashboard_renderer/add_panel_from_library';
import { getCreateVisualizationButtonTitle } from '../../_dashboard_app_strings';

interface AddMenuProps {
  dashboardApi: DashboardApi;
  anchorElement: HTMLElement;
  coreServices: CoreStart;
}

const getControlButtonTitle = () =>
  i18n.translate('dashboard.solutionToolbar.controlsMenuButtonLabel', {
    defaultMessage: 'Controls',
  });

const getAddControlButtonTitle = () =>
  i18n.translate('dashboard.solutionToolbar.addControlButtonLabel', {
    defaultMessage: 'Control',
  });

const getAddESQLControlButtonTitle = () =>
  i18n.translate('dashboard.solutionToolbar.addESQLControlButtonLabel', {
    defaultMessage: 'Variable Control',
  });

const getAddTimeSliderControlButtonTitle = () =>
  i18n.translate('dashboard.solutionToolbar.addTimeSliderControlButtonLabel', {
    defaultMessage: 'Time slider control',
  });

const container = document.createElement('div');
let isOpen = false;

function cleanup() {
  if (!isOpen) {
    return;
  }
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export const AddMenu = ({ dashboardApi, anchorElement, coreServices }: AddMenuProps) => {
  /** TODO: Set this as part of the timeslider conversion */
  const [hasTimeSliderControl, setHasTimeSliderControl] = useState(false);

  const closePopover = useCallback(() => {
    cleanup();
    anchorElement.focus();
  }, [anchorElement]);

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
  }, [coreServices, dashboardApi]);

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      initialFocusedItemIndex: 0,
      items: [
        {
          name: getCreateVisualizationButtonTitle(),
          icon: 'lensApp',
          'data-test-subj': 'dashboardCreateNewVisButton',
          onClick: async () => {
            await executeAddLensPanelAction(dashboardApi);
            closePopover();
          },
        },
        {
          name: i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
            defaultMessage: 'New panel',
          }),
          icon: 'plusInCircle',
          'data-test-subj': 'dashboardOpenAddPanelFlyoutButton',
          onClick: () => {
            openAddPanelFlyout();
            closePopover();
          },
        },
        {
          name: i18n.translate('dashboard.solutionToolbar.controlsMenuButtonLabel', {
            defaultMessage: 'Controls',
          }),
          icon: 'controlsHorizontal',
          'data-test-subj': 'dashboard-controls-menu-button',
          panel: 1,
        },
        {
          name: i18n.translate('dashboard.solutionToolbar.addSectionButtonLabel', {
            defaultMessage: 'Collapsible section',
          }),
          icon: 'section',
          'data-test-subj': 'dashboardAddCollapsibleSectionButton',
          onClick: () => {
            dashboardApi.addNewSection();
            closePopover();
          },
        },
        {
          name: i18n.translate(
            'dashboard.buttonToolbar.buttons.addFromLibrary.libraryButtonLabel',
            {
              defaultMessage: 'From library',
            }
          ),
          'data-test-subj': 'dashboardAddFromLibraryButton',
          icon: 'folderOpen',
          onClick: () => {
            addFromLibrary(dashboardApi);
            closePopover();
          },
        },
      ],
    },
    {
      id: 1,
      title: getControlButtonTitle(),
      initialFocusedItemIndex: 0,
      items: [
        {
          name: getAddControlButtonTitle(),
          icon: 'empty',
          'data-test-subj': 'controls-create-button',
          onClick: async () => {
            await executeCreateControlPanelAction(dashboardApi);
            closePopover();
          },
        },
        {
          name: getAddESQLControlButtonTitle(),
          icon: 'empty',
          'data-test-subj': 'esql-control-create-button',
          onClick: async () => {
            await executeCreateESQLControlPanelAction(dashboardApi);
            closePopover();
          },
        },
        {
          name: getAddTimeSliderControlButtonTitle(),
          icon: 'empty',
          'data-test-subj': 'controls-create-timeslider-button',
          disabled: hasTimeSliderControl,
          onClick: async () => {
            await executeCreateTimeSliderControlPanelAction(dashboardApi);
            closePopover();
          },
        },
      ],
    },
  ];

  return (
    <EuiWrappingPopover
      isOpen={isOpen}
      closePopover={closePopover}
      button={anchorElement}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiWrappingPopover>
  );
};

export function showAddMenu({ dashboardApi, anchorElement, coreServices }: AddMenuProps) {
  if (isOpen) {
    cleanup();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);
  ReactDOM.render(
    <KibanaContextProvider services={coreServices}>
      <AddMenu
        dashboardApi={dashboardApi}
        anchorElement={anchorElement}
        coreServices={coreServices}
      />
    </KibanaContextProvider>,
    container
  );
}
function uuidv4() {
  throw new Error('Function not implemented.');
}
