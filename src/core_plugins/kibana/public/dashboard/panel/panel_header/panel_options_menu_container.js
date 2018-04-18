import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { PanelOptionsMenu } from './panel_options_menu';

import {
  deletePanel,
  maximizePanel,
  minimizePanel,
  resetPanelTitle,
  setPanelTitle,
} from '../../actions';

import {
  getEmbeddable,
  getEmbeddableEditUrl,
  getMaximizedPanelId,
  getPanel,
  getEmbeddableTitle
} from '../../selectors';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  const panel = getPanel(dashboard, panelId);
  const embeddableTitle = getEmbeddableTitle(dashboard, panelId);
  return {
    panelTitle: panel.title === undefined ? embeddableTitle : panel.title,
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : null,
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
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
  onMaximizePanel: () => dispatch(maximizePanel(panelId)),
  onMinimizePanel: () => dispatch(minimizePanel()),
  onResetPanelTitle: () => dispatch(resetPanelTitle(panelId)),
  onUpdatePanelTitle: (newTitle) => dispatch(setPanelTitle(newTitle, panelId)),
});

const mergeProps = (stateProps, dispatchProps) => {
  const { isExpanded, editUrl, panelTitle } = stateProps;
  const { onMaximizePanel, onMinimizePanel, ...dispatchers } = dispatchProps;
  const toggleExpandedPanel = () => isExpanded ? onMinimizePanel() : onMaximizePanel();

  return {
    panelTitle,
    toggleExpandedPanel,
    isExpanded,
    editUrl,
    ...dispatchers,
  };
};

export const PanelOptionsMenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(PanelOptionsMenu);

PanelOptionsMenuContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
};
