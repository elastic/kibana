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
import { getSelectedResolvedArgs } from '../../state/selectors/workpad';

const renderLoading = branch(
  props => [null, 'pending'].includes(getState(props.renderable)),
  renderComponent(Loading)
);

const renderInvalidExpression = branch(
  props => !props.expressionType || getError(props.renderable) !== null,
  renderComponent(InvalidExpression)
);

function mapStateToProps(state) {
  return {
    renderable: getSelectedResolvedArgs(state, 'expressionRenderable'),
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
    dispatchProps.fetchRenderable();
  }

  return Object.assign({}, stateProps, dispatchProps, ownProps, {
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
