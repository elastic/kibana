import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { PanelHeader } from './panel_header';
import { PanelOptionsMenuContainer } from './panel_options_menu_container';
import { PanelMaximizeIcon } from './panel_maximize_icon';
import { PanelMinimizeIcon } from './panel_minimize_icon';
import { DashboardViewMode } from '../../dashboard_view_mode';

import {
  maximizePanel,
  minimizePanel,
} from '../../actions';

import {
  getPanel,
  getMaximizedPanelId,
  getFullScreenMode,
  getViewMode,
  getHidePanelTitles,
  getEmbeddableTitle
} from '../../selectors';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const panel = getPanel(dashboard, panelId);
  const embeddableTitle = getEmbeddableTitle(dashboard, panelId);
  return {
    title: panel.title === undefined ? embeddableTitle : panel.title,
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
    isViewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
    hidePanelTitles: getHidePanelTitles(dashboard),
  };
};

const mapDispatchToProps = (dispatch, { panelId }) => ({
  onMaximizePanel: () => dispatch(maximizePanel(panelId)),
  onMinimizePanel: () => dispatch(minimizePanel()),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { isExpanded, isViewOnlyMode, title, hidePanelTitles } = stateProps;
  const { onMaximizePanel, onMinimizePanel } = dispatchProps;
  const { panelId } = ownProps;
  let actions;

  if (isViewOnlyMode) {
    actions = isExpanded ?
      <PanelMinimizeIcon onMinimize={onMinimizePanel} /> :
      <PanelMaximizeIcon onMaximize={onMaximizePanel} />;
  } else {
    actions = <PanelOptionsMenuContainer panelId={panelId} embeddable={ownProps.embeddable} />;
  }

  return {
    title,
    actions,
    isViewOnlyMode,
    hidePanelTitles,
  };
};

export const PanelHeaderContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(PanelHeader);

PanelHeaderContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
  embeddable: PropTypes.object,
};
