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
  getEmbeddable,
  getEmbeddableTitle,
  getMaximizedPanelId,
  getFullScreenMode,
  getViewMode
} from '../../selectors';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return {
    title: embeddable ? getEmbeddableTitle(dashboard, panelId) : '',
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
    isViewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
  };
};

const mapDispatchToProps = (dispatch, { panelId }) => ({
  onMaximizePanel: () => dispatch(maximizePanel(panelId)),
  onMinimizePanel: () => dispatch(minimizePanel()),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { isExpanded, isViewOnlyMode, title } = stateProps;
  const { onMaximizePanel, onMinimizePanel } = dispatchProps;
  const { panelId, embeddableHandler } = ownProps;
  let actions;

  if (isViewOnlyMode) {
    actions = isExpanded ?
      <PanelMinimizeIcon onMinimize={onMinimizePanel} /> :
      <PanelMaximizeIcon onMaximize={onMaximizePanel} />;
  } else {
    actions = (
      <PanelOptionsMenuContainer
        panelId={panelId}
        embeddableHandler={embeddableHandler}
      />
    );
  }

  return {
    title,
    actions,
  };
};

export const PanelHeaderContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(PanelHeader);

PanelHeaderContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
  /**
   * @type {EmbeddableHandler}
   */
  embeddableHandler: PropTypes.shape({
    destroy: PropTypes.func.isRequired,
    render: PropTypes.func.isRequired,
    addDestroyEmeddable: PropTypes.func.isRequired,
  }).isRequired,
};
