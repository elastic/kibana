import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { Label } from 'react-bootstrap';
import { ArgTypeUnknown } from './arg_type_unknown';
import { ArgTypeContextPending } from './arg_type_context_pending';
import { ArgTypeContextError } from './arg_type_context_error';

function checkState(state) {
  return ({ context, expressionType }) => {
    const matchState = (!context || context.state === state);
    return Boolean(expressionType && expressionType.requiresContext) && matchState;
  };
}

const nullExpressionType = branch(props => !props.expressionType, renderComponent(ArgTypeUnknown));
const contextPending = branch(checkState('pending'), renderComponent(ArgTypeContextPending));
const contextError = branch(checkState('error'), renderComponent(ArgTypeContextError));

export const ArgType = compose(nullExpressionType, contextPending, contextError)((props) => {
  const {
    name,
    args,
    context,
    expressionType,
    nextExpressionType,
    onValueChange,
  } = props;

  const expressionProps = { args, context, nextExpressionType, onValueChange };

  return (
    <div>
      {/*
        TODO: I'm leaving the { name } thing here for you Joe, while you debug. Get rid of it before we ship.
      */}
      <Label className="pull-right">{ name }</Label><br/>
      { expressionType.render(expressionProps) }
    </div>
  );
});

ArgType.propTypes = {
  name: PropTypes.string.isRequired,
  args: PropTypes.object.isRequired,
  context: PropTypes.object,
  expressionType: PropTypes.object.isRequired,
  nextExpressionType: PropTypes.object,
  onValueChange: PropTypes.func,
};
