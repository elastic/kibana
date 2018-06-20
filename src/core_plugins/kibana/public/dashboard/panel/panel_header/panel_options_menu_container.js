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

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { panelActionsStore } from '../../store/panel_actions_store';
import { embeddableShape } from 'ui/embeddable';
import { PanelOptionsMenu } from './panel_options_menu';
import {
  buildEuiContextMenuPanels,
  getEditPanelAction,
  getRemovePanelAction,
  getCustomizePanelAction,
  getToggleExpandPanelAction,
} from './panel_actions';

import {
  deletePanel,
  maximizePanel,
  minimizePanel,
  resetPanelTitle,
  setPanelTitle,
  setVisibleContextMenuPanelId,
} from '../../actions';

import {
  getEmbeddable,
  getEmbeddableEditUrl,
  getMaximizedPanelId,
  getPanel,
  getEmbeddableTitle,
  getContainerState,
  getVisibleContextMenuPanelId,
  getViewMode,
} from '../../selectors';
import { DashboardContextMenuPanel } from 'ui/dashboard_panel_actions';
import { DashboardViewMode } from '../../dashboard_view_mode';

const mapStateToProps = ({ dashboard }, { panelId }) => {
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
const mapDispatchToProps = (dispatch, { panelId }) => ({
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
  },
  closeContextMenu: () => dispatch(setVisibleContextMenuPanelId()),
  openContextMenu: () => dispatch(setVisibleContextMenuPanelId(panelId)),
  onMaximizePanel: () => dispatch(maximizePanel(panelId)),
  onMinimizePanel: () => dispatch(minimizePanel()),
  onResetPanelTitle: () => dispatch(resetPanelTitle(panelId)),
  onUpdatePanelTitle: (newTitle) => dispatch(setPanelTitle({ title: newTitle, panelId: panelId })),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { isExpanded, panelTitle, containerState, visibleContextMenuPanelId, isViewMode } = stateProps;
  const isPopoverOpen = visibleContextMenuPanelId === ownProps.panelId;
  const {
    onMaximizePanel,
    onMinimizePanel,
    onDeletePanel,
    onResetPanelTitle,
    onUpdatePanelTitle,
    closeContextMenu,
    openContextMenu,
  } = dispatchProps;
  const toggleContextMenu = () => isPopoverOpen ? closeContextMenu() : openContextMenu();

  // Outside click handlers will trigger for every closed context menu, we only want to react to clicks external to
  // the currently opened menu.
  const closeMyContextMenuPanel = () => {
    if (isPopoverOpen) {
      closeContextMenu();
    }
  };

  const toggleExpandedPanel = () => {
    isExpanded ? onMinimizePanel() : onMaximizePanel();
    closeMyContextMenuPanel();
  };

  let panels = [];

  // Don't build the panels if the pop over is not open, or this gets expensive - this function is called once for
  // every panel, every time any state changes.
  if (isPopoverOpen) {
    const contextMenuPanel = new DashboardContextMenuPanel({
      title: 'Options',
      id: 'mainMenu'
    });

    const actions = [
      getEditPanelAction(),
      getCustomizePanelAction({
        onResetPanelTitle,
        onUpdatePanelTitle,
        title: panelTitle,
        closeContextMenu: closeMyContextMenuPanel
      }),
      getToggleExpandPanelAction({ isExpanded, toggleExpandedPanel }),
      getRemovePanelAction(onDeletePanel),
    ].concat(panelActionsStore.actions);

    panels = buildEuiContextMenuPanels({ contextMenuPanel, actions, embeddable: ownProps.embeddable, containerState });
  }

  return {
    panels,
    toggleContextMenu,
    closeContextMenu: closeMyContextMenuPanel,
    isPopoverOpen,
    isViewMode,
  };
};

export const PanelOptionsMenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(PanelOptionsMenu);

PanelOptionsMenuContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
  embeddable: embeddableShape,
};
