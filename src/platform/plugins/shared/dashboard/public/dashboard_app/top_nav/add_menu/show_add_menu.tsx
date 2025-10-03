/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactDOM from 'react-dom';

import {
  type EuiContextMenuPanelDescriptor,
  EuiContextMenu,
  EuiWrappingPopover,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DefaultControlApi } from '@kbn/controls-plugin/public';
import { ESQLVariableType, EsqlControlType, apiPublishesESQLVariables } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { apiHasType, useStateFromPublishingSubject } from '@kbn/presentation-publishing';

import { openLazyFlyout } from '@kbn/presentation-util';
import { executeAddLensPanelAction } from '../../../dashboard_actions/execute_add_lens_panel_action';
import type { DashboardApi } from '../../../dashboard_api/types';
import { addFromLibrary } from '../../../dashboard_renderer/add_panel_from_library';
import { uiActionsService } from '../../../services/kibana_services';
import {
  getAddControlButtonTitle,
  getControlButtonTitle,
  getAddESQLControlButtonTitle,
  getAddTimeSliderControlButtonTitle,
  getCreateVisualizationButtonTitle,
  getEditControlGroupButtonTitle,
} from '../../_dashboard_app_strings';

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

export const AddMenu = ({ dashboardApi, anchorElement, coreServices }: AddMenuProps) => {
  const [hasTimeSliderControl, setHasTimeSliderControl] = useState(false);
  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);

  useEffect(() => {
    if (!controlGroupApi) {
      return;
    }

    const subscription = controlGroupApi.children$.subscribe((children) => {
      const nextHasTimeSliderControl = Object.values(children).some((controlApi) => {
        return apiHasType(controlApi) && controlApi.type === TIME_SLIDER_CONTROL;
      });
      setHasTimeSliderControl(nextHasTimeSliderControl);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupApi]);

  const onSave = () => {
    dashboardApi.scrollToTop();
  };

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
          name: getControlButtonTitle(),
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
          disabled: !controlGroupApi,
          'data-test-subj': 'controls-create-button',
          onClick: () => {
            controlGroupApi?.openAddDataControlFlyout({ onSave });
            closePopover();
          },
        },
        {
          name: getAddESQLControlButtonTitle(),
          icon: 'empty',
          disabled: !controlGroupApi,
          'data-test-subj': 'esql-control-create-button',
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
          'data-test-subj': 'controls-create-timeslider-button',
          disabled: !controlGroupApi || hasTimeSliderControl,
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
          isSeparator: true,
          key: 'sep',
        },
        {
          name: getEditControlGroupButtonTitle(),
          icon: 'empty',
          'data-test-subj': 'controls-settings-button',
          disabled: !controlGroupApi,
          onClick: async () => {
            controlGroupApi?.onEdit();
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
