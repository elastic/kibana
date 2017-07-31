import React from 'react';
import PropTypes from 'prop-types';
import { compose, withState, withHandlers } from 'recompose';
import { debounce } from 'lodash';
import { ControlLabel, FormControl } from 'react-bootstrap';

export const LabeledInputComponent = ({ label, inputValue, argName, debouncedOnChange, setInput }) => {
  const updateInput = (ev) => {
    ev.persist(); // https://facebook.github.io/react/docs/events.html#event-pooling
    setInput(ev.target.value);
    debouncedOnChange(argName, ev);
  };

  return (
    <div className={`canvas__argtype--seriesStyle--${argName}`}>
      <ControlLabel>{label}</ControlLabel>
      <FormControl
        type="text"
        value={inputValue}
        onChange={updateInput}
      />
    </div>
  );
};

LabeledInputComponent.propTypes = {
  label: PropTypes.string.isRequired,
  inputValue: PropTypes.string.isRequired,
  argName: PropTypes.string.isRequired,
  debouncedOnChange: PropTypes.func.isRequired,
  setInput: PropTypes.func.isRequired,
};

export const LabeledInput = compose(
  withHandlers({
    debouncedOnChange: ({ onChange }) => debounce(onChange, 800),
  }),
  withState('inputValue', 'setInput', ({ value }) => value)
)(LabeledInputComponent);

LabeledInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
