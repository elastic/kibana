import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

export const MathExpression = ({ onChange, value, inputRef }) => {
  const options = [
    'median',
    'mean',
    'sum',
    'min',
    'max',
    'mode',
    'size',
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
        <option value="">value</option>
        { options.map(option => (<option key={option} value={option}>{option}</option>))}
      </FormControl>
    </div>
  );
};

MathExpression.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  inputRef: PropTypes.func,
};
