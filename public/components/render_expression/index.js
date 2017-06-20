import { connect } from 'react-redux';
import { get } from 'lodash';
import { RenderExpression as Component } from './render_expression';
import { elements as elementsRegistry } from '../../lib/elements';
import { getValue } from '../../lib/resolved_arg';
import { getType } from '../../../common/types/get_type';
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

let cleanupFn;
const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const noop = () => {};
  const { renderable } = stateProps;
  const { done } = ownProps;
  const element = elementsRegistry.get(get(getValue(renderable), 'as'));

  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    expressionType: getType(getValue(renderable)),
    removeElement: dispatchProps.removeElementFromPage(stateProps.selectedPage),
    renderFn(domNode) {
      cleanupFn = element.render(domNode, getValue(renderable).value, done || noop);
    },
    destroyFn: () => {
      if (cleanupFn) {
        element.destroy(cleanupFn);
        cleanupFn = null;
      }
    },
  });
};

export const RenderExpression = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
