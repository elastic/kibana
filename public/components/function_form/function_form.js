import PropTypes from 'prop-types';
import { compose, branch, renderComponent, lifecycle } from 'recompose';
import { FunctionFormComponent } from './function_form_component';
import { FunctionUnknown } from './function_unknown';
import { FunctionFormContextPending } from './function_form_context_pending';
import { FunctionFormContextError } from './function_form_context_error';

function requiresContext(expressionType) {
  return Boolean(expressionType && expressionType.requiresContext);
}

// helper to check the state of the passed in expression type
function checkState(state) {
  return ({ context, expressionType }) => {
    const matchState = (!context || context.state === state);
    return requiresContext(expressionType) && matchState;
  };
}

const branches = [
  // if no expressionType was provided, render the ArgTypeUnknown component
  branch(props => !props.expressionType, renderComponent(FunctionUnknown)),
  // if the expressionType is in a pending state, render ArgTypeContextPending
  branch(checkState('pending'), renderComponent(FunctionFormContextPending)),
  // if the expressionType is in an error state, render ArgTypeContextError
  branch(checkState('error'), renderComponent(FunctionFormContextError)),
];

// dispatch context update if none is provided
const fetchContext = (props, force = false) => {
  const { expressionType, context, updateContext } = props;
  if (force || (context == null && requiresContext(expressionType))) {
    updateContext();
  }
};

const contextLifecycle = lifecycle({
  componentWillMount() {
    fetchContext(this.props);
  },
  componentWillReceiveProps(newProps) {
    const oldContext = this.props.contextExpression;
    const newContext = newProps.contextExpression;
    fetchContext(newProps, oldContext !== newContext);
  },
});

export const FunctionForm = compose(
  contextLifecycle,
  ...branches
)(FunctionFormComponent);

FunctionForm.propTypes = {
  expressionType: PropTypes.object,
  context: PropTypes.object,
  contextExpression: PropTypes.string,
  updateContext: PropTypes.func,
};
