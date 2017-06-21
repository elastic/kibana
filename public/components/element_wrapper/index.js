import { connect } from 'react-redux';
import { ElementWrapper as Component } from './element_wrapper';
import { fetchRenderable, removeElement } from '../../state/actions/elements';
import { selectElement } from '../../state/actions/transient';
import { getSelectedElementId, getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';

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
  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    removeElement: dispatchProps.removeElementFromPage(stateProps.selectedPage),
  });
};

export const ElementWrapper = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
