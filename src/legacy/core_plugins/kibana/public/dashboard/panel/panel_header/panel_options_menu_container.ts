/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import {
  buildEuiContextMenuPanels,
  ContainerState,
  ContextMenuPanel,
  Embeddable,
} from 'ui/embeddable';
import { Dispatch } from 'redux';
import { panelActionsStore } from '../../store/panel_actions_store';
import {
  getCustomizePanelAction,
  getEditPanelAction,
  getInspectorPanelAction,
  getRemovePanelAction,
  getToggleExpandPanelAction,
} from './panel_actions';
import { PanelOptionsMenu, PanelOptionsMenuProps } from './panel_options_menu';

import {
  closeContextMenu,
  deletePanel,
  maximizePanel,
  minimizePanel,
  resetPanelTitle,
  setPanelTitle,
  setVisibleContextMenuPanelId,
} from '../../actions';

import { CoreKibanaState } from '../../../selectors';
import { DashboardViewMode } from '../../dashboard_view_mode';
import {
  getContainerState,
  getEmbeddable,
  getEmbeddableEditUrl,
  getEmbeddableTitle,
  getMaximizedPanelId,
  getPanel,
  getViewMode,
  getVisibleContextMenuPanelId,
  PanelId,
} from '../../selectors';

interface PanelOptionsMenuContainerDispatchProps {
  onDeletePanel: () => void;
  onCloseContextMenu: () => void;
  openContextMenu: () => void;
  onMaximizePanel: () => void;
  onMinimizePanel: () => void;
  onResetPanelTitle: () => void;
  onUpdatePanelTitle: (title: string) => void;
}

interface PanelOptionsMenuContainerOwnProps {
  panelId: PanelId;
  embeddable?: Embeddable;
}

interface PanelOptionsMenuContainerStateProps {
  panelTitle?: string;
  editUrl: string | null | undefined;
  isExpanded: boolean;
  containerState: ContainerState;
  visibleContextMenuPanelId: PanelId | undefined;
  isViewMode: boolean;
}

const mapStateToProps = (
  { dashboard }: CoreKibanaState,
  { panelId }: PanelOptionsMenuContainerOwnProps
) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  const panel = getPanel(dashboard, panelId);
  const embeddableTitle = getEmbeddableTitle(dashboard, panelId);
  const containerState = getContainerState(dashboard, panelId);
  const visibleContextMenuPanelId = getVisibleContextMenuPanelId(dashboard);
  const viewMode = getViewMode(dashboard);
  return {
    panelTitle: panel.title === undefined ? embeddableTitle : panel.title,
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : null,
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
    containerState,
    visibleContextMenuPanelId,
    isViewMode: viewMode === DashboardViewMode.VIEW,
  };
};

/**
 * @param dispatch {Function}
 * @param embeddableFactory {EmbeddableFactory}
 * @param panelId {string}
 */
const mapDispatchToProps = (
  dispatch: Dispatch,
  { panelId }: PanelOptionsMenuContainerOwnProps
) => ({
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
  },
  onCloseContextMenu: () => dispatch(closeContextMenu()),
  openContextMenu: () => dispatch(setVisibleContextMenuPanelId(panelId)),
  onMaximizePanel: () => dispatch(maximizePanel(panelId)),
  onMinimizePanel: () => dispatch(minimizePanel()),
  onResetPanelTitle: () => dispatch(resetPanelTitle(panelId)),
  onUpdatePanelTitle: (newTitle: string) => dispatch(setPanelTitle({ title: newTitle, panelId })),
});

const mergeProps = (
  stateProps: PanelOptionsMenuContainerStateProps,
  dispatchProps: PanelOptionsMenuContainerDispatchProps,
  ownProps: PanelOptionsMenuContainerOwnProps
) => {
  const {
    isExpanded,
    panelTitle,
    containerState,
    visibleContextMenuPanelId,
    isViewMode,
  } = stateProps;
  const isPopoverOpen = visibleContextMenuPanelId === ownProps.panelId;
  const {
    onMaximizePanel,
    onMinimizePanel,
    onDeletePanel,
    onResetPanelTitle,
    onUpdatePanelTitle,
    onCloseContextMenu,
    openContextMenu,
  } = dispatchProps;
  const toggleContextMenu = () => (isPopoverOpen ? onCloseContextMenu() : openContextMenu());

  // Outside click handlers will trigger for every closed context menu, we only want to react to clicks external to
  // the currently opened menu.
  const closeMyContextMenuPanel = () => {
    if (isPopoverOpen) {
      onCloseContextMenu();
    }
  };

  const toggleExpandedPanel = () => {
    // eslint-disable-next-line no-unused-expressions
    isExpanded ? onMinimizePanel() : onMaximizePanel();
    closeMyContextMenuPanel();
  };

  let panels: EuiContextMenuPanelDescriptor[] = [];

  // Don't build the panels if the pop over is not open, or this gets expensive - this function is called once for
  // every panel, every time any state changes.
  if (isPopoverOpen) {
    const contextMenuPanel = new ContextMenuPanel({
      title: i18n.translate('kbn.dashboard.panel.optionsMenu.optionsContextMenuTitle', {
        defaultMessage: 'Options',
      }),
      id: 'mainMenu',
    });

    const actions = [
      getInspectorPanelAction({
        closeContextMenu: closeMyContextMenuPanel,
        panelTitle,
      }),
      getEditPanelAction(),
      getCustomizePanelAction({
        onResetPanelTitle,
        onUpdatePanelTitle,
        title: panelTitle,
        closeContextMenu: closeMyContextMenuPanel,
      }),
      getToggleExpandPanelAction({ isExpanded, toggleExpandedPanel }),
      getRemovePanelAction(onDeletePanel),
    ].concat(panelActionsStore.actions);

    panels = buildEuiContextMenuPanels({
      contextMenuPanel,
      actions,
      embeddable: ownProps.embeddable,
      containerState,
    });
  }

  return {
    panels,
    toggleContextMenu,
    closeContextMenu: closeMyContextMenuPanel,
    isPopoverOpen,
    isViewMode,
  };
};

export const PanelOptionsMenuContainer = connect<
  PanelOptionsMenuContainerStateProps,
  PanelOptionsMenuContainerDispatchProps,
  PanelOptionsMenuContainerOwnProps,
  PanelOptionsMenuProps,
  CoreKibanaState
>(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(PanelOptionsMenu);
