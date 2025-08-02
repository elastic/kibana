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
import { EuiContextMenu, EuiWrappingPopover } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import { ESQLVariableType, EsqlControlType, apiPublishesESQLVariables } from '@kbn/esql-types';
import { addFromLibrary } from './add_panel_from_library';
import { DashboardApi } from '../dashboard_api/types';
import { executeAddLensPanelAction } from '../dashboard_actions/execute_add_lens_panel_action';
import { AddPanelFlyout } from '../dashboard_app/top_nav/add_panel_button/components/add_panel_flyout';
import {
  getAddControlButtonTitle,
  getControlButtonTitle,
  getAddESQLControlButtonTitle,
  getAddTimeSliderControlButtonTitle,
} from '../dashboard_app/_dashboard_app_strings';
import { uiActionsService } from '../services/kibana_services';

interface ShowAddMenuProps {
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

const AddMenu = ({ dashboardApi, anchorElement, coreServices }: ShowAddMenuProps) => {
  const onSave = () => {
    dashboardApi.scrollToTop();
  };
  const closePopover = useCallback(() => {
    anchorElement.focus();
    cleanup();
  }, [anchorElement]);
  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);

  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Create a new visualization',
          icon: 'lensApp',
          onClick: async () => {
            await executeAddLensPanelAction(dashboardApi);
            closePopover();
          },
        },
        {
          name: 'Add a panel',
          icon: 'plusInCircle',
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
              }
            );

            dashboardApi.openOverlay(overlayRef);
            closePopover();
          },
        },
        {
          name: 'Add a collapsible section',
          icon: 'section',
          onClick: () => {
            dashboardApi.addNewSection();
            closePopover();
          },
        },
        {
          name: 'Add a control',
          icon: 'controlsHorizontal',
          panel: 1,
        },
        {
          name: 'Add from library',
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
      initialFocusedItemIndex: 1,
      items: [
        {
          name: getAddControlButtonTitle(),
          icon: 'plusInCircle',
          onClick: () => {
            controlGroupApi?.openAddDataControlFlyout({ onSave });
            closePopover();
          },
        },
        {
          name: getAddTimeSliderControlButtonTitle(),
          icon: 'timeslider',
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
        {
          name: getAddESQLControlButtonTitle(),
          icon: 'plusInCircle',
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
                onSaveControl: (controlState) => {
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

export function ShowAddMenu({ dashboardApi, anchorElement, coreServices }: ShowAddMenuProps) {
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
