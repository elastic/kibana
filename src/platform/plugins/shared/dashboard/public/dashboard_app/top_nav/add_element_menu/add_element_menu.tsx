/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useCallback, useState } from 'react';

import { EuiContextMenu, EuiContextMenuItem, EuiWrappingPopover } from '@elastic/eui';
import { ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';
import ReactDOM from 'react-dom';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import { addFromLibrary } from '../../../dashboard_renderer/add_panel_from_library';
import { DashboardApi } from '../../../dashboard_api/types';
import { DashboardContext, useDashboardApi } from '../../../dashboard_api/use_dashboard_api';

import { coreServices } from '../../../services/kibana_services';
import { AddPanelFlyout } from '../add_panel_button/components/add_panel_flyout';
import { getControlMenuItems } from '../controls_toolbar_button/controls_toolbar_button';

export function AddElementMenuButton({
  anchorElement,
  dashboardApi,
  onClose,
}: {
  anchorElement: HTMLElement;
  dashboardApi: DashboardApi;
  onClose: () => void;
}) {
  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);
  const isDisabled = false;
  const [isClosed, setIsClosed] = useState(false);

  const closeMenu = useCallback(() => {
    setIsClosed(true);
  }, []);

  return (
    <EuiWrappingPopover
      data-test-subj="lnsApp__settingsMenu"
      ownFocus
      button={anchorElement}
      closePopover={onClose}
      panelPaddingSize="none"
      isOpen={!isClosed}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: [
              {
                renderItem: () => <AddPanel isDisabled={isDisabled} onClose={closeMenu} anchorElement={anchorElement}/>,
              },
              {
                name: 'Collapsible section',
              },
              {
                renderItem: () => (
                  <AddFromLibraryButton
                    onClick={() => {addFromLibrary(dashboardApi);closeMenu();}}
                    size="s"
                    data-test-subj="dashboardAddFromLibraryButton"
                    isDisabled={isDisabled}
                  />
                ),
              },
              {
                name: 'Controls',
                icon: 'controlsHorizontal',
                panel: 1,
              },
            ],
          },
          {
            id: 1,
            title: i18n.translate('sharedUXPackages.buttonToolbar.buttons.controls.title', {
              defaultMessage: 'Controls',
            }),
            content: <> {getControlMenuItems(onClose, controlGroupApi)}</>,
          },
        ]}
      />
    </EuiWrappingPopover>
  );
}

/**
 * Toggles the settings menu
 *
 * Note: the code inside this function is covered only at the functional test level
 */
export function toggleAddMenuOpen(props: {
  anchorElement: HTMLElement;
  dashboardApi: DashboardApi;
}) {
  if (isMenuOpen) {
    closeSettingsMenu();
    return;
  }

  isMenuOpen = true;
  document.body.appendChild(container);

  const element = (
    <DashboardContext.Provider value={props.dashboardApi}>
      <AddElementMenuButton
        {...props}
        anchorElement={props.anchorElement}
        onClose={closeSettingsMenu}
        dashboardApi={props.dashboardApi}
      />
    </DashboardContext.Provider>
  );
  ReactDOM.render(element, container);
}

const container = document.createElement('div');
let isMenuOpen = false;

function closeSettingsMenu() {
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isMenuOpen = false;
}

export const AddPanel = ({ isDisabled, onClose, anchorElement }: { isDisabled?: boolean, onClose?: () => void, anchorElement: HTMLElement }) => {
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
        <AddPanelFlyout dashboardApi={dashboardApi} />,
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
    <EuiContextMenuItem
      icon="plusInCircle"
      data-test-subj="controls-create-button"
      aria-label={'Panel'}
      disabled={isDisabled}
      onClick={()=> { openFlyout(); onClose?.(); }}
    >
      Panel
    </EuiContextMenuItem>
  );
};

export type Props = Omit<ToolbarButtonProps<'standard'>, 'iconType' | 'label' | 'type'>;

const label = {
  getLibraryButtonLabel: () =>
    i18n.translate('sharedUXPackages.buttonToolbar.buttons.addFromLibrary.libraryButtonLabel', {
      defaultMessage: 'from library',
    }),
};

/**
 * A button that acts to add an item from the library to a solution, typically through a modal.
 */
export const AddFromLibraryButton = ({ onClick, size = 'm', ...rest }: Props) => {
  console.log('rest', rest);
  return (
    <EuiContextMenuItem {...rest} type="empty" onClick={onClick} icon="folderOpen">
      {label.getLibraryButtonLabel()}
    </EuiContextMenuItem>
  );
};
