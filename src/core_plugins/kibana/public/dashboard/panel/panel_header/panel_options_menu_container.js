import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { PanelOptionsMenu } from './panel_options_menu';

import {
  deletePanel,
  destroyEmbeddable
} from '../../actions';

import {
  getEmbeddable,
  getEmbeddableEditUrl,
} from '../../reducers';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return {
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : '',
  };
};

/**
 * @param dispatch {Function}
 * @param embeddableHandler {EmbeddableHandler}
 * @param panelId {string}
 */
const mapDispatchToProps = (dispatch, { embeddableHandler, panelId }) => ({
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
    dispatch(destroyEmbeddable(panelId, embeddableHandler));
  }
});

export const PanelOptionsMenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(PanelOptionsMenu);

PanelOptionsMenuContainer.propTypes = {
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
