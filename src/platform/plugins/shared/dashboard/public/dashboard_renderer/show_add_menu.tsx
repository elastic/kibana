/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactDOM from 'react-dom';

import { EuiContextMenu, EuiWrappingPopover } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DefaultControlApi } from '@kbn/controls-plugin/public';
import { ESQLVariableType, EsqlControlType, apiPublishesESQLVariables } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { executeAddLensPanelAction } from '../dashboard_actions/execute_add_lens_panel_action';
import type { DashboardApi } from '../dashboard_api/types';
import {
  getAddControlButtonTitle,
  getControlButtonTitle,
  getAddESQLControlButtonTitle,
  getAddTimeSliderControlButtonTitle,
  getCreateVisualizationButtonTitle,
} from '../dashboard_app/_dashboard_app_strings';
import { AddPanelFlyout } from '../dashboard_app/top_nav/add_panel_button/components/add_panel_flyout';
import { uiActionsService } from '../services/kibana_services';
import { addFromLibrary } from './add_panel_from_library';

interface AddMenuProps {
  dashboardApi: DashboardApi;
  anchorElement: HTMLElement;
  coreServices: CoreStart;
}

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

const AddMenu = ({ dashboardApi, anchorElement, coreServices }: AddMenuProps) => {
  const onSave = () => {
    dashboardApi.scrollToTop();
  };
  const closePopover = useCallback(() => {
    cleanup();
    anchorElement.focus();
  }, [anchorElement]);
  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);

  const panels = [
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
            const overlayRef = coreServices.overlays.openFlyout(
              toMountPoint(
                React.createElement(function () {
                  return (
                    <AddPanelFlyout
                      dashboardApi={dashboardApi}
                      closeFlyout={() => {
                        dashboardApi.clearOverlays();
                        overlayRef.close();
                        // Focus the anchor element after closing the flyout
                        setTimeout(() => anchorElement.focus(), 0);
                      }}
                      ariaLabelledBy="addPanelsFlyout"
                    />
                  );
                }),
                coreServices
              ),
              {
                size: 'm',
                maxWidth: 500,
                paddingSize: 'm',
                'data-test-subj': 'dashboardPanelSelectionFlyout',
                onClose: () => {
                  dashboardApi.clearOverlays();
                  overlayRef.close();
                  // Focus the anchor element after closing the flyout
                  setTimeout(() => anchorElement.focus(), 0);
                },
              }
            );

            dashboardApi.openOverlay(overlayRef);
            closePopover();
          },
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
          name: i18n.translate('dashboard.solutionToolbar.addControlButtonLabel', {
            defaultMessage: 'Control',
          }),
          icon: 'controlsHorizontal',
          'data-test-subj': 'dashboard-controls-menu-button',
          panel: 1,
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
          onClick: () => {
            controlGroupApi?.openAddDataControlFlyout({ onSave });
            closePopover();
          },
        },
        {
          name: getAddESQLControlButtonTitle(),
          icon: 'empty',
          'data-test-subj': 'controls-create-esql-button',
          onClick: async () => {
            try {
              const variablesInParent = apiPublishesESQLVariables(dashboardApi)
                ? dashboardApi.esqlVariables$.value
                : [];

              await uiActionsService.getTrigger('ESQL_CONTROL_TRIGGER').exec({
                queryString: '',
                variableType: ESQLVariableType.VALUES,
                controlType: EsqlControlType.VALUES_FROM_QUERY,
                esqlVariables: variablesInParent,
                onSaveControl: (controlState: DefaultControlApi) => {
                  controlGroupApi?.addNewPanel({
                    panelType: 'esqlControl',
                    serializedState: {
                      rawState: {
                        ...controlState,
                      },
                    },
                  });
                  dashboardApi.scrollToTop();
                  closePopover();
                },
                onCancelControl: closePopover,
              });
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Error getting ESQL control trigger', e);
            }
            closePopover();
          },
        },
        {
          name: getAddTimeSliderControlButtonTitle(),
          icon: 'empty',
          onClick: async () => {
            controlGroupApi?.addNewPanel({
              panelType: TIME_SLIDER_CONTROL,
              serializedState: {
                rawState: {
                  grow: true,
                  width: 'large',
                  id: uuidv4(),
                },
              },
            });
            dashboardApi.scrollToTop();
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
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiWrappingPopover>
  );
};

export function ShowAddMenu({ dashboardApi, anchorElement, coreServices }: AddMenuProps) {
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
