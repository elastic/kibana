import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

export const SimpleMathFunction = ({ onChange, value, inputRef }) => {
  const options = [
    { label: 'Value', value: '' },
    { label: 'Average', value: 'mean' },
    { label: 'Sum', value: 'sum' },
    { label: 'Count', value: 'size' },
    { label: 'Max', value: 'max' },
    { label: 'Min', value: 'min' },
    { label: 'Median', value: 'median' },
    { label: 'Mode', value: 'mode' },
  ];

  const onSelect = (ev) => onChange(ev.target.value);

  return (
    <div className="canvas__argtype--mathExpression">
      <FormControl
        componentClass="select"
        placeholder="raw"
        value={value || ''}
        onChange={onSelect}
        inputRef={inputRef}
      >
        { options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </FormControl>
    </div>
  );
};

SimpleMathFunction.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  inputRef: PropTypes.func,
};
