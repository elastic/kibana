import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { ElementWrapper as Component } from './element_wrapper';
import { removeElement, setPosition } from '../../state/actions/elements';
import { selectElement } from '../../state/actions/transient';
import { getFullscreen, getEditing } from '../../state/selectors/app';

import {
  getSelectedElementId,
  getResolvedArgs,
  getSelectedPage,
} from '../../state/selectors/workpad';
import { getState, getValue, getError } from '../../lib/resolved_arg';
import { elementsRegistry } from '../../lib/elements_registry';
import { createHandlers } from './lib/handlers';

const mapStateToProps = (state, { element }) => ({
  isFullscreen: getFullscreen(state),
  isEditing: getEditing(state),
  resolvedArg: getResolvedArgs(state, element.id, 'expressionRenderable'),
  isSelected: element.id === getSelectedElementId(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { element }) => ({
  selectElement: isInteractable => () => isInteractable && dispatch(selectElement(element.id)),
  removeElement: (pageId) => () => dispatch(removeElement(element.id, pageId)),
  setPosition: (pageId) => (position) => dispatch(setPosition(element.id, pageId, position)),
  handlers: (pageId) => createHandlers(element, pageId, dispatch),
});

const mergeProps = (stateProps, dispatchProps, { element }) => {
  const { resolvedArg, selectedPage, isSelected, isFullscreen, isEditing } = stateProps;
  const renderable = getValue(resolvedArg);

  return {
    position: element.position,
    setPosition: dispatchProps.setPosition(selectedPage),
    selectElement: dispatchProps.selectElement(!isFullscreen && isEditing),
    removeElement: dispatchProps.removeElement(selectedPage),
    handlers: dispatchProps.handlers(selectedPage),
    isSelected: isSelected,
    elementTypeDefintion: elementsRegistry.get(get(renderable, 'as')),
    state: getState(resolvedArg),
    error: getError(resolvedArg),
    renderable,
  };
};

export const ElementWrapper = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);

ElementWrapper.propTypes = {
  element: PropTypes.object,
};
