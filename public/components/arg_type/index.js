import { connect } from 'react-redux';
import { get } from 'lodash';
import { ArgType as Component } from './arg_type';
import { findExpressionType } from '../../lib/find_expression_type';
import { fetchContext, setArgumentAtIndex } from '../../state/actions/elements';
import {
  getSelectedElement,
  getSelectedPage,
  getSelectedResolvedArgs,
} from '../../state/selectors/workpad';

const mapStateToProps = (state, { expressionIndex }) => {
  const resolvedArgs = getSelectedResolvedArgs(state);

  return {
    context: get(resolvedArgs, ['expressionContext', expressionIndex - 1], null),
    element: getSelectedElement(state),
    pageId: getSelectedPage(state),
  };
};

const mapDispatchToProps = ({
  fetchContext,
  setArgumentAtIndex,
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { context, element, pageId } = stateProps;
  const { expressionIndex, argType, nextArgType } = ownProps;
  const expressionType = findExpressionType(argType);
  const nextExpressionType = nextArgType ? findExpressionType(nextArgType) : nextArgType;

  const props = Object.assign({}, stateProps, dispatchProps, ownProps, {
    expressionType,
    nextExpressionType,
    name: get(expressionType, 'displayName', argType),
    updateContext: () => dispatchProps.fetchContext({ index: expressionIndex }),
    onValueChange: (arg) => dispatchProps.setArgumentAtIndex({
      arg,
      element,
      pageId,
      index: expressionIndex,
    }),
  });

  if (context == null && Boolean(expressionType && expressionType.requiresContext)) {
    props.updateContext();
  }

  return props;
};

export const ArgType = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
