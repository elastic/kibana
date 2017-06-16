import { connect } from 'react-redux';
import { get } from 'lodash';
import { ArgType as Component } from './arg_type';
import { toAstValue } from '../../lib/map_arg_value';
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

const mapDispatchToProps = (dispatch, { expressionIndex }) => ({
  setArgument: (props) => dispatch(setArgumentAtIndex({ index: expressionIndex, ...props })),
  updateContext: () => dispatch(fetchContext({ index: expressionIndex })),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;

  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    onValueChange: (arg) => {
      const mappedArg = Object.keys(arg).reduce((acc, argName) => Object.assign(acc, {
        [argName]: toAstValue(arg[argName]),
      }), {});

      return dispatchProps.setArgument({
        arg: mappedArg,
        element,
        pageId,
      });
    },
  });
};

export const ArgType = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
