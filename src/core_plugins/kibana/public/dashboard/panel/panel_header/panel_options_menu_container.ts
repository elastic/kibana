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

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { ContainerState, Embeddable, embeddableShape } from 'ui/embeddable';
import { panelActionsStore } from '../../store/panel_actions_store';
import {
  buildEuiContextMenuPanels,
  getCustomizePanelAction,
  getEditPanelAction,
  getInspectorPanelAction,
  getRemovePanelAction,
  getToggleExpandPanelAction,
} from './panel_actions';
import { PanelOptionsMenu, PanelOptionsMenuProps } from './panel_options_menu';

import {
  deletePanel,
  maximizePanel,
  minimizePanel,
  resetPanelTitle,
  setPanelTitle,
  setVisibleContextMenuPanelId,
} from '../../actions';

import { Dispatch } from 'redux';
import { DashboardContextMenuPanel } from 'ui/dashboard_panel_actions';
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
} from '../../selectors';
import { PanelId } from '../../types';
import { EuiContextMenuPanelShape } from './panel_actions/build_context_menu';

interface PanelOptionsMenuContainerOwnProps {
  panelId: PanelId;
  embeddable: Embeddable;
}

interface PanelOptionsMenuContainerStateProps {
  editUrl?: string;
  panelTitle?: string;
  isExpanded: boolean;
  containerState: ContainerState;
  visibleContextMenuPanelId?: PanelId;
  isViewMode: boolean;
}

const mapStateToProps = (
  state: CoreKibanaState,
  ownProps: PanelOptionsMenuContainerOwnProps
): PanelOptionsMenuContainerStateProps => {
  const { dashboard } = state;
  const { panelId } = ownProps;
  const embeddable = getEmbeddable(dashboard, panelId);
  const panel = getPanel(dashboard, panelId);
  const embeddableTitle = getEmbeddableTitle(dashboard, panelId);
  const containerState = getContainerState(dashboard, panelId);
  const visibleContextMenuPanelId = getVisibleContextMenuPanelId(dashboard);
  const viewMode = getViewMode(dashboard);
  return {
    containerState,
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : undefined,
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
    isViewMode: viewMode === DashboardViewMode.VIEW,
    panelTitle: panel.title === undefined ? embeddableTitle : panel.title,
    visibleContextMenuPanelId,
  };
};

interface PanelOptionsMenuContainerDispatchProps {
  closeContextMenu: () => void;
  onDeletePanel: () => void;
  onMaximizePanel: () => void;
  onMinimizePanel: () => void;
  onResetPanelTitle: () => void;
  onUpdatePanelTitle: () => void;
  openContextMenu: () => void;
}

/**
 * @param dispatch {Function}
 * @param embeddableFactory {EmbeddableFactory}
 * @param panelId {string}
 */
const mapDispatchToProps = (
  dispatch: Dispatch<CoreKibanaState>,
  { panelId }: PanelOptionsMenuContainerOwnProps
) => ({
  closeContextMenu: () => {
    dispatch(setVisibleContextMenuPanelId(undefined));
  },
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
  },
  onMaximizePanel: () => {
    dispatch(maximizePanel(panelId));
  },
  onMinimizePanel: () => {
    dispatch(minimizePanel());
  },
  onResetPanelTitle: () => {
    dispatch(resetPanelTitle(panelId));
  },
  onUpdatePanelTitle: (newTitle: string) => {
    dispatch(setPanelTitle({ title: newTitle, panelId }));
  },
  openContextMenu: () => {
    dispatch(setVisibleContextMenuPanelId(panelId));
  },
});

const mergeProps = (
  stateProps: PanelOptionsMenuContainerStateProps,
  dispatchProps: PanelOptionsMenuContainerDispatchProps,
  ownProps: PanelOptionsMenuContainerOwnProps
): PanelOptionsMenuProps => {
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
    closeContextMenu,
    openContextMenu,
  } = dispatchProps;
  const toggleContextMenu = () =>
    isPopoverOpen ? closeContextMenu() : openContextMenu();

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

  let panels: EuiContextMenuPanelShape[] = [];

  // Don't build the panels if the pop over is not open, or this gets expensive - this function is called once for
  // every panel, every time any state changes.
  if (isPopoverOpen) {
    const contextMenuPanel = new DashboardContextMenuPanel({
      id: 'mainMenu',
      title: 'Options',
    });

    const actions = [
      getInspectorPanelAction(closeMyContextMenuPanel, panelTitle),
      getEditPanelAction(),
      getCustomizePanelAction(
        onResetPanelTitle,
        onUpdatePanelTitle,
        closeMyContextMenuPanel,
        panelTitle
      ),
      getToggleExpandPanelAction(isExpanded, toggleExpandedPanel),
      getRemovePanelAction(onDeletePanel),
    ].concat(panelActionsStore.actions);

    panels = buildEuiContextMenuPanels(
      contextMenuPanel,
      actions,
      ownProps.embeddable,
      containerState
    );
  }

  return {
    closeContextMenu: closeMyContextMenuPanel,
    isPopoverOpen,
    isViewMode,
    panels,
    toggleContextMenu,
  };
};

export const PanelOptionsMenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(PanelOptionsMenu);
