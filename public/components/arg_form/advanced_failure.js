import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps, withPropsOnChange } from 'recompose';
import { Button, FormGroup, FormControl } from 'react-bootstrap';
import { createStatefulPropHoc } from '../../components/enhance/stateful_prop';
import { fromExpression, toExpression } from '../../../common/lib/ast';

export const AdvancedFailureComponent = (props) => {
  const {
    onValueChange,
    defaultValue,
    argExpression,
    updateArgExpression,
    resetErrorState,
    valid,
  } = props;

  const valueChange = (ev) => {
    ev.preventDefault();

    resetErrorState(); // when setting a new value, attempt to reset the error state

    if (valid) {
      return onValueChange(fromExpression(argExpression.trim(), 'argument'));
    }

  };

  const confirmReset = (ev) => {
    ev.preventDefault();
    resetErrorState(); // when setting a new value, attempt to reset the error state
    onValueChange(fromExpression(defaultValue, 'argument'));
  };

  return (
    <div className="canvas__arg--error canvas__arg--error-simple">
      <form onSubmit={(e) => valueChange(e)}>
        <FormGroup className={!valid && 'has-error'}>
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
          <Button disabled={!valid} type="submit" bsSize="xsmall" bsStyle="primary">Apply</Button>
        </div>
      </form>
    </div>
  );
};

AdvancedFailureComponent.propTypes = {
  defaultValue: PropTypes.string,
  onValueChange: PropTypes.func.isRequired,
  argExpression: PropTypes.string.isRequired,
  updateArgExpression: PropTypes.func.isRequired,
  resetErrorState: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired,
};

export const AdvancedFailure = compose(
  withProps(({ argValue }) => ({
    argExpression: toExpression(argValue, 'argument'),
  })),
  createStatefulPropHoc('argExpression', 'updateArgExpression'),
  withPropsOnChange(['argExpression'], ({ argExpression }) => ({
    valid: (function () {
      try {
        fromExpression(argExpression, 'argument');
        return true;
      } catch (e) {
        return false;
      }
    }()),
  })),

)(AdvancedFailureComponent);

AdvancedFailure.propTypes = {
  argValue: PropTypes.any.isRequired,
};
