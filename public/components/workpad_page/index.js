import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, withProps } from 'recompose';
import { aeroelastic } from '../../lib/aeroelastic_kibana';
import { removeElement, setPosition } from '../../state/actions/elements';
import { selectElement } from '../../state/actions/transient';
import { getFullscreen, getEditing } from '../../state/selectors/app';
import { withEventHandlers } from './event_handlers';
import { WorkpadPage as Component } from './workpad_page';

const mapStateToProps = state => {
  return {
    isFullscreen: getFullscreen(state),
    isEditing: getEditing(state),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    removeElement: pageId => elementId => dispatch(removeElement(elementId, pageId)),
    selectElement: isInteractable => elementId =>
      isInteractable && dispatch(selectElement(elementId)),
    setPosition: pageId => (elementId, position) =>
      dispatch(setPosition(elementId, pageId, position)),
  };
};

const mergeProps = (stateProps, { removeElement }, props) => {
  const { isEditing, isFullscreen } = stateProps;
  const { page } = props;

  return {
    ...props,
    isEditable: !isFullscreen && isEditing,
    key: page.id,
    removeElement,
  };
};

export const WorkpadPage = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('updateCount', 'setUpdateCount', 0), // TODO: remove this, see setUpdateCount below
  withProps(({ updateCount, setUpdateCount, page, removeElement }) => {
    const { shapes, selectedShapes = [] } = aeroelastic.getStore(page.id).currentScene;

    return {
      elements: shapes,
      selectedShapes,
      commit: (...args) => {
        aeroelastic.commit(page.id, ...args);
        // TODO: remove this, it's a hack to force react to rerender
        setUpdateCount(updateCount + 1);
      },
      remove: () => {
        if (selectedShapes && selectedShapes.length === 1) {
          removeElement(page.id)(selectedShapes[0]);
        }
      },
    };
  }), // Updates states; needs to have both local and global
  withEventHandlers // Captures user intent, needs to have reconciled state
)(Component);

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};
