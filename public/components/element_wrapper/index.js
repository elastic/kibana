import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { ElementWrapper as Component } from './element_wrapper';
import { removeElement, setPosition } from '../../state/actions/elements';
import { selectElement } from '../../state/actions/transient';
import { getSelectedElementId, getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue, getError } from '../../lib/resolved_arg';
import { elements as elementsRegistry } from '../../lib/elements';
import { createHandlers } from './lib/handlers';

const mapStateToProps = (state, { element }) => ({
  resolvedArg: getResolvedArgs(state, element.id, 'expressionRenderable'),
  isSelected: element.id === getSelectedElementId(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { element }) => ({
  selectElement() {
    dispatch(selectElement(element.id));
  },

  removeElement: (pageId) => () => {
    dispatch(removeElement(element.id, pageId));
  },

  setPosition: (pageId) => (position) => {
    dispatch(setPosition(element.id, pageId, position));
  },

  handlers: (pageId) => createHandlers(element, pageId, dispatch),
});

const mergeProps = (stateProps, dispatchProps, { element }) => {
  const renderable = getValue(stateProps.resolvedArg);

  return {
    position: element.position,
    setPosition: dispatchProps.setPosition(stateProps.selectedPage),
    selectElement: dispatchProps.selectElement,
    removeElement: dispatchProps.removeElement(stateProps.selectedPage),
    handlers: dispatchProps.handlers(stateProps.selectedPage),
    isSelected: stateProps.isSelected,
    elementTypeDefintion: elementsRegistry.get(get(renderable, 'as')),
    state: getState(stateProps.resolvedArg),
    error: getError(stateProps.resolvedArg),
    renderable,
  };
};

export const ElementWrapper = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);

ElementWrapper.propTypes = {
  element: PropTypes.object,
};
