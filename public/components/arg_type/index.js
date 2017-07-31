import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { ArgType as Component } from './arg_type';
import { findExpressionType } from '../../lib/find_expression_type';
import { fetchContext, setArgumentAtIndex, addArgumentValueAtIndex, deleteArgumentAtIndex } from '../../state/actions/elements';
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

const mapDispatchToProps = (dispatch, { expressionIndex }) => ({
  addArgument: (element, pageId) => (argName, argValue) => () => {
    dispatch(addArgumentValueAtIndex({ index: expressionIndex, element, pageId, argName, value: argValue }));
  },
  updateContext: () => dispatch(fetchContext({ index: expressionIndex })),
  setArgument: (element, pageId) => (argName, valueIndex) => (value) => {
    dispatch(setArgumentAtIndex({
      index: expressionIndex,
      element,
      pageId,
      argName,
      value,
      valueIndex,
    }));
  },
  deleteArgument: (element, pageId) => (argName, argIndex) => () => {
    dispatch(deleteArgumentAtIndex({
      index: expressionIndex,
      element,
      pageId,
      argName,
      argIndex,
    }));
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;
  const { argType, nextArgType } = ownProps;

  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    expressionType: findExpressionType(argType),
    nextExpressionType: nextArgType ? findExpressionType(nextArgType) : nextArgType,
    onValueChange: dispatchProps.setArgument(element, pageId),
    onValueAdd: dispatchProps.addArgument(element, pageId),
    onValueRemove: dispatchProps.deleteArgument(element, pageId),
  });
};

export const ArgType = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);

ArgType.propTypes = {
  expressionIndex: PropTypes.number,
  argType: PropTypes.string,
  nextArgType: PropTypes.string,
};
