import { connect } from 'react-redux';
import { renderComponent, branch } from 'recompose';
import { get, flowRight } from 'lodash';
import { RenderExpression as Component } from './render_expression';
import { InvalidExpression } from './invalid_element';
import { Loading } from '../loading';
import { elements } from '../../lib/elements';
import { getState, getValue, getError } from '../../lib/resolved_arg';
import { getType } from '../../../common/types/get_type';
import { fetchRenderable } from '../../state/actions/elements';
import { getArg } from '../../state/selectors/resolved_args';
import { getSelectedElement, getSelectedElementId } from '../../state/selectors/workpad';

const renderLoading = branch(
  props => [null, 'pending'].includes(getState(props.renderable)),
  renderComponent(Loading)
);

const renderInvalidExpression = branch(
  props => !props.expressionType || getError(props.renderable) !== null,
  renderComponent(InvalidExpression)
);

function mapStateToProps(state) {
  const elementId = getSelectedElementId(state);
  const selectedElement = getSelectedElement(state);

  return {
    selectedElement,
    renderable: getArg(state, [elementId, 'expressionRenderable']),
  };
}

const mapDispatchToProps = {
  fetchRenderable,
};

let cleanupFn;
function mergeProps(stateProps, dispatchProps, ownProps) {
  const noop = () => {};
  const { renderable } = stateProps;
  const { done } = ownProps;
  const element = elements.get(get(getValue(renderable), 'as'));

  if (getState(renderable) === null) {
    dispatchProps.fetchRenderable({ element: stateProps.selectedElement });
  }


  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    element,
    expressionType: getType(getValue(renderable)),
    renderFn(domNode) {
      cleanupFn = element.render(domNode, getValue(renderable).value, done || noop);
    },
    destroyFn: (element) => {
      if (cleanupFn) element.destroy(cleanupFn);
    },
  });
}

export const RenderExpression = flowRight([
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  renderLoading,
  renderInvalidExpression,
])(Component);
