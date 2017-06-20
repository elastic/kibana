import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps, branch, renderComponent, lifecycle, setPropTypes } from 'recompose';
import { ArgTypeUnknown } from './arg_type_unknown';
import { ArgTypeContextPending } from './arg_type_context_pending';
import { ArgTypeContextError } from './arg_type_context_error';
import { findExpressionType } from '../../lib/find_expression_type';

// helper to check the state of the passed in expression type
function checkState(state) {
  return ({ context, expressionType }) => {
    const matchState = (!context || context.state === state);
    return Boolean(expressionType && expressionType.requiresContext) && matchState;
  };
}

// resolve the expressionType from the argType
const addProps = compose(
  setPropTypes({
    argType: PropTypes.string,
  }),
  withProps((props) => ({
    expressionType: findExpressionType(props.argType),
  }))
);

// if no expressionType was provided, render the ArgTypeUnknown component
const noExpressionType = branch(props => !props.expressionType, renderComponent(ArgTypeUnknown));
// if the expressionType is in a pending state, render ArgTypeContextPending
const contextPending = branch(checkState('pending'), renderComponent(ArgTypeContextPending));
// if the expressionType is in an error state, render ArgTypeContextError
const contextError = branch(checkState('error'), renderComponent(ArgTypeContextError));

// dispatch context update if none is provided
const fetchContext = (props) => {
  const { expressionType, context, updateContext } = props;
  if (context == null && Boolean(expressionType && expressionType.requiresContext)) {
    updateContext();
  }
};

const contextLifecycle = lifecycle({
  componentWillMount() {
    fetchContext(this.props);
  },
  componentWillReceiveProps(newProps) {
    fetchContext(newProps);
  },
});

// compose the above branch components, to short-circuit rending this ArgType component
const ArgTypeComponent = ({ args, context, onValueChange, nextArgType, expressionType }) => {
  const nextExpressionType = nextArgType ? findExpressionType(nextArgType) : nextArgType;

  return (
    <div className="canvas__argtype">
      { expressionType.render({ args, context, nextExpressionType, onValueChange }) }
    </div>
  );
};

ArgTypeComponent.propTypes = {
  args: PropTypes.object.isRequired,
  expressionType: PropTypes.object.isRequired,
  nextArgType: PropTypes.string,
  context: PropTypes.object,
  onValueChange: PropTypes.func,
};

export const ArgType = compose(
  addProps,
  contextLifecycle,
  noExpressionType,
  contextPending,
  contextError
)(ArgTypeComponent);
