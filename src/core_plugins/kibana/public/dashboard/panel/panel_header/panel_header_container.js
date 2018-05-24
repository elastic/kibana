import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { embeddableShape } from 'ui/embeddable';
import { PanelHeader } from './panel_header';
import { DashboardViewMode } from '../../dashboard_view_mode';

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

export const PanelHeaderContainer = connect(
  mapStateToProps,
)(PanelHeader);

PanelHeaderContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
  embeddable: embeddableShape,
};
