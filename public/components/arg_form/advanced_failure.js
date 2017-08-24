import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { Button, FormGroup, FormControl } from 'react-bootstrap';
import { statefulProp } from '../../lib/stateful_component';
import { toExpressionAst, toExpressionString, fromExpressionString } from '../../lib/map_arg_value';

export const AdvancedFailureComponent = (props) => {
  const {
    onValueChange,
    defaultValue,
    argExpression,
    argValueAst,
    updateArgExpression,
    resetErrorState,
  } = props;

  const valueChange = (ev) => {
    ev.preventDefault();

    resetErrorState(); // when setting a new value, attempt to reset the error state
    return onValueChange(fromExpressionString(argExpression, argValueAst.type));
  };

  const confirmReset = (ev) => {
    ev.preventDefault();

    resetErrorState(); // when setting a new value, attempt to reset the error state
    // TODO: fix this! Super hacky... we try the default as an expression first, and then fall back to a string
    try {
      const newArgValue = fromExpressionString(defaultValue, 'expression');
      onValueChange(newArgValue);
    } catch (e) {
      const newArgValue = fromExpressionString(defaultValue);
      onValueChange(newArgValue);
    }
  };

  return (
    <div className="canvas__arg--error canvas__arg--error-simple">
      <form onSubmit={valueChange}>
        <FormGroup>
          <FormControl
            spellCheck={false}
            componentClass="textarea"
            value={argExpression}
            onChange={updateArgExpression}
            rows="3"
          />
        </FormGroup>
        <div className="canvas__arg--controls--submit">
          {(defaultValue && defaultValue.length) && (
            <Button bsSize="xsmall" bsStyle="link" onClick={confirmReset}>Reset</Button>
          )}
          <Button type="submit" bsSize="xsmall" bsStyle="primary">Apply</Button>
        </div>
      </form>
    </div>
  );
};

AdvancedFailureComponent.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  defaultValue: PropTypes.string.isRequired,
  argValueAst: PropTypes.object.isRequired,
  argExpression: PropTypes.string.isRequired,
  updateArgExpression: PropTypes.func.isRequired,
  resetErrorState: PropTypes.func.isRequired,
};

export const AdvancedFailure = compose(
  withProps(({ argValue }) => {
    const argValueAst = toExpressionAst(argValue);

    return {
      argValueAst,
      argExpression: toExpressionString(argValueAst),
    };
  }),
  statefulProp('argExpression', 'updateArgExpression')
)(AdvancedFailureComponent);

AdvancedFailure.propTypes = {
  argValue: PropTypes.object.isRequired,
};
