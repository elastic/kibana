import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { EmbeddableViewport } from './embeddable_viewport';

import {
  getContainerState,
} from '../selectors';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  return {
    containerState: getContainerState(dashboard, panelId),
  };
};

export const EmbeddableViewportContainer = connect(
  mapStateToProps,
)(EmbeddableViewport);

EmbeddableViewportContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
};
