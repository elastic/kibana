import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { ArgType as Component } from './arg_type';
import { toAstValue } from '../../lib/map_arg_value';
import { findExpressionType } from '../../lib/find_expression_type';
import { fetchContext, setArgumentAtIndex, deleteArgumentAtIndex } from '../../state/actions/elements';
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
  setArgument: (element, pageId) => (arg) => dispatch(setArgumentAtIndex({ index: expressionIndex, element, pageId, arg })),
  deleteArgument: (element, pageId) => (argName) => dispatch(deleteArgumentAtIndex({ index: expressionIndex, element, pageId, argName })),
  updateContext: () => dispatch(fetchContext({ index: expressionIndex })),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;
  const { argType, nextArgType } = ownProps;

  const setArgument = dispatchProps.setArgument(element, pageId);
  const deleteArgument = dispatchProps.deleteArgument(element, pageId);

  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    expressionType: findExpressionType(argType),
    nextExpressionType: nextArgType ? findExpressionType(nextArgType) : nextArgType,
    onValueChange: (arg) => {
      const mappedArg = Object.keys(arg).reduce((acc, argName) => Object.assign(acc, {
        [argName]: toAstValue(arg[argName]),
      }), {});

      return setArgument(mappedArg);
    },
    onValueRemove: (argName) => deleteArgument(argName),
  });
};

export const ArgType = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);

ArgType.propTypes = {
  expressionIndex: PropTypes.number,
  argType: PropTypes.string,
  nextArgType: PropTypes.string,
};
