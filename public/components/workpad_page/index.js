import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, withProps } from 'recompose';
import { aeroelastic } from '../../lib/aeroelastic_kibana';
import { removeElement } from '../../state/actions/elements';
import { getFullscreen, getEditing } from '../../state/selectors/app';
import { getElements } from '../../state/selectors/workpad';
import { withEventHandlers } from './event_handlers';
import { WorkpadPage as Component } from './workpad_page';

const mapStateToProps = (state, ownProps) => {
  return {
    isEditable: !getFullscreen(state) && getEditing(state),
    elements: getElements(state, ownProps.page.id),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    removeElement: pageId => elementId => dispatch(removeElement(elementId, pageId)),
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
  connect(mapStateToProps, mapDispatchToProps),
  withProps(({ isSelected, animation }) => {
    function getClassName() {
      if (animation) return animation.name;
      return isSelected ? 'canvasPage--isActive' : 'canvasPage--isInactive';
    }

    function getAnimationStyle() {
      if (!animation) return {};
      return {
        animationDirection: animation.direction,
        // TODO: Make this configurable
        animationDuration: '1s',
      };
    }

    return {
      className: getClassName(),
      animationStyle: getAnimationStyle(),
    };
  }),
  withState('updateCount', 'setUpdateCount', 0), // TODO: remove this, see setUpdateCount below
  withProps(({ updateCount, setUpdateCount, page, elements: pageElements, removeElement }) => {
    const { shapes, selectedShapes = [], cursor } = aeroelastic.getStore(page.id).currentScene;
    const elementLookup = new Map(pageElements.map(element => [element.id, element]));
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
      cursor,
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
