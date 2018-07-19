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

const getRootElementId = (lookup, id) => {
  if (!lookup.has(id)) {
    return null;
  }
  const element = lookup.get(id);
  return element.parent ? getRootElementId(lookup, element.parent) : element.id;
};

export const WorkpadPage = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('updateCount', 'setUpdateCount', 0), // TODO: remove this, see setUpdateCount below
  withProps(({ updateCount, setUpdateCount, page, removeElement }) => {
    const { shapes, selectedShapes = [] } = aeroelastic.getStore(page.id).currentScene;
    const elementLookup = new Map(page.elements.map(element => [element.id, element]));
    const shapeLookup = new Map(shapes.map(shape => [shape.id, shape]));
    const elements = shapes.map(
      shape =>
        elementLookup.has(shape.id)
          ? // instead of just combining `element` with `shape`, we make property transfer explicit
            { ...shape, filter: elementLookup.get(shape.id).filter }
          : shape
    );
    const selectedElements = selectedShapes.map(id => getRootElementId(shapeLookup, id));
    return {
      elements,
      selectedShapes,
      commit: (...args) => {
        aeroelastic.commit(page.id, ...args);
        // TODO: remove this, it's a hack to force react to rerender
        setUpdateCount(updateCount + 1);
      },
      remove: () => {
        // currently, handle the removal of one element, exploiting multiselect subsequently
        if (selectedElements[0]) {
          removeElement(page.id)(selectedElements[0]);
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
