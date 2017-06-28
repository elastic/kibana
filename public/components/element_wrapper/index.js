import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { ElementWrapper as Component } from './element_wrapper';
import { fetchRenderable, removeElement } from '../../state/actions/elements';
import { selectElement } from '../../state/actions/transient';
import { getSelectedElementId, getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue, getError } from '../../lib/resolved_arg';
import { elements as elementsRegistry } from '../../lib/elements';

const mapStateToProps = (state, { element }) => ({
  resolvedArg: getResolvedArgs(state, element.id, 'expressionRenderable'),
  isSelected: element.id === getSelectedElementId(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { element }) => ({
  fetchRenderable: () => dispatch(fetchRenderable(element.id)),
  select(ev) {
    ev && ev.stopPropagation();
    dispatch(selectElement(element.id));
  },
  removeElementFromPage: (pageId) => (ev) => {
    ev && ev.stopPropagation();
    dispatch(removeElement(element.id, pageId));
  },
});

const mergeProps = (stateProps, dispatchProps, { element }) => {
  const renderable = getValue(stateProps.resolvedArg);

  return {
    position: element.position,
    select: dispatchProps.select,
    remove: dispatchProps.removeElementFromPage(stateProps.selectedPage),
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
