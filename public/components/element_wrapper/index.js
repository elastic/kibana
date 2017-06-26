import { connect } from 'react-redux';
import { get } from 'lodash';
import { ElementWrapper as Component } from './element_wrapper';
import { fetchRenderable, removeElement } from '../../state/actions/elements';
import { selectElement } from '../../state/actions/transient';
import { getSelectedElementId, getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue } from '../../lib/resolved_arg';
import { elements as elementsRegistry } from '../../lib/elements';

const mapStateToProps = (state, { element }) => ({
  renderable: getResolvedArgs(state, element.id, 'expressionRenderable'),
  selectedElement: getSelectedElementId(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { element }) => ({
  fetchRenderable: () => dispatch(fetchRenderable(element.id)),
  selectElement(ev) {
    ev && ev.stopPropagation();
    dispatch(selectElement(element.id));
  },
  removeElementFromPage: (pageId) => (ev) => {
    ev && ev.stopPropagation();
    dispatch(removeElement(element.id, pageId));
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const renderableValue = getValue(stateProps.renderable);

  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    removeElement: dispatchProps.removeElementFromPage(stateProps.selectedPage),
    renderableValue,
    renderableState: getState(stateProps.renderable),
    renderableElement: elementsRegistry.get(get(renderableValue, 'as')),
  });
};

export const ElementWrapper = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
