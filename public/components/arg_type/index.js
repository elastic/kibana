import { connect } from 'react-redux';
import { get } from 'lodash';
import { ArgType as Component } from './arg_type';
import { findExpressionType } from '../../lib/find_expression_type';
import { fetchContext, setExpressionAst } from '../../state/actions/elements';
import {
  getElementById,
  getSelectedElement,
  getSelectedPage,
  getSelectedResolvedArgs,
} from '../../state/selectors/workpad';

function getExpressionContext(resolvedArgs, expressionIndex) {
  if (expressionIndex === 0) return null;
  return get(resolvedArgs, ['expressionContexts', expressionIndex - 1]);
}

const mapStateToProps = (state, { expressionIndex }) => ({
  context: getExpressionContext(getSelectedResolvedArgs(state), expressionIndex),
  pageId: getSelectedPage(state),
  element: getElementById(state, getSelectedElement(state)),
});

const mapDispatchToProps = ({
  fetchContext,
  setExpressionAst,
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { context, element, pageId } = stateProps;
  const { expressionIndex, argType, nextArgType } = ownProps;
  const updateContext = () => dispatchProps.fetchContext({ element, index: expressionIndex });
  const expressionType = findExpressionType(argType);
  const nextExpressionType = nextArgType ? findExpressionType(nextArgType) : nextArgType;

  if (typeof context === 'undefined' && expressionType.requiresContext) {
    updateContext();
  }

  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    expressionType,
    nextExpressionType,
    requiresContext: Boolean(expressionType && expressionType.requiresContext),
    name: get(expressionType, 'displayName', argType),
    updateContext,
    onValueChange: (ast) => dispatchProps.setExpressionAst({ ast, element, pageId, index: expressionIndex }),
  });
};

export const ArgType = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Component);
