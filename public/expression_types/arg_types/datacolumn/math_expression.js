import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

export const MathExpression = ({ onChange, value, defaultValue, inputRef }) => {
  const onSelect = (ev) => onChange(ev.target.value);
  const options = [
    'median',
    'mean',
    'sum',
    'min',
    'max',
    'mode',
  ];

  const renderControlled = () => (<FormControl
    componentClass="select"
    placeholder="raw"
    value={value}
    onChange={onSelect}
    inputRef={inputRef}
  >
    <option value="">value</option>
    { options.map(option => (<option key={option} value={option}>{option}</option>))}
  </FormControl>);

  const renderUncontrolled = () => (<FormControl
    componentClass="select"
    placeholder="raw"
    defaultValue={defaultValue || ''}
    onChange={onSelect}
    inputRef={inputRef}
  >
    <option value="">value</option>
    { options.map(option => (<option key={option} value={option}>{option}</option>))}
  </FormControl>);

  return (
    <div className="canvas__argtype--mathExpression">
      { value ? renderControlled() : renderUncontrolled() }
    </div>
  );
};

MathExpression.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  inputRef: PropTypes.func,
};
