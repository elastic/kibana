import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FunctionForm as Component } from './function_form';
import { findExpressionType } from '../../lib/find_expression_type';
import { getId } from '../../lib/get_id.js';
import { createAsset } from '../../state/actions/assets';
import {
  fetchContext,
  setArgumentAtIndex,
  addArgumentValueAtIndex,
  deleteArgumentAtIndex,
} from '../../state/actions/elements';
import {
  getSelectedElement,
  getSelectedPage,
  getContextForIndex,
} from '../../state/selectors/workpad';

const mapStateToProps = (state, { expressionIndex }) => ({
  context: getContextForIndex(state, expressionIndex),
  element: getSelectedElement(state),
  pageId: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { expressionIndex }) => ({
  addArgument: (element, pageId) => (argName, argValue) => () => {
    dispatch(addArgumentValueAtIndex({ index: expressionIndex, element, pageId, argName, value: argValue }));
  },
  updateContext: (element) => () => dispatch(fetchContext(expressionIndex, element)),
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
  onAssetAdd: (type, content) => {
    // make the ID here and pass it into the action
    const assetId = getId('asset');
    dispatch(createAsset(type, content, assetId));

    // then the id, so the caller knows the id that will be created
    return assetId;
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;
  const { argType, nextArgType } = ownProps;
  const { updateContext, setArgument, addArgument, deleteArgument, ...dispatchers } = dispatchProps;

  return Object.assign({}, stateProps, dispatchers, ownProps, {
    updateContext: updateContext(element),
    expressionType: findExpressionType(argType),
    nextExpressionType: nextArgType ? findExpressionType(nextArgType) : nextArgType,
    onValueChange: setArgument(element, pageId),
    onValueAdd: addArgument(element, pageId),
    onValueRemove: deleteArgument(element, pageId),
  });
};

export const FunctionForm = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);

FunctionForm.propTypes = {
  expressionIndex: PropTypes.number,
  argType: PropTypes.string,
  nextArgType: PropTypes.string,
};
