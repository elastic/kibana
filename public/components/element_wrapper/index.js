import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getFullscreen, getEditing } from '../../state/selectors/app';
import { getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue, getError } from '../../lib/resolved_arg';
import { ElementWrapper as Component } from './element_wrapper';
import { createHandlers as createHandlersWithDispatch } from './lib/handlers';

const mapStateToProps = (state, { element }) => ({
  isFullscreen: getFullscreen(state),
  isEditing: getEditing(state),
  resolvedArg: getResolvedArgs(state, element.id, 'expressionRenderable'),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { element }) => ({
  createHandlers: pageId => () => createHandlersWithDispatch(element, pageId, dispatch),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { resolvedArg, selectedPage } = stateProps;
  const renderable = getValue(resolvedArg);
  const { element } = ownProps;

  return {
    state: getState(resolvedArg),
    error: getError(resolvedArg),
    renderable,
    transformMatrix: element.transformMatrix,
    id: element.id,
    a: element.a,
    b: element.b,
    createHandlers: dispatchProps.createHandlers(selectedPage),
  };
};

export const ElementWrapper = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);

ElementWrapper.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
};
