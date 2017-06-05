import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

export const MathExpression = ({ onChange, defaultValue, inputRef }) => {
  const onSelect = (ev) => onChange(ev.target.value);

  return (
    <div className="canvas__argtype--mathExpression">
      <FormControl
        componentClass="select"
        placeholder="raw"
        defaultValue={defaultValue || ''}
        onChange={onSelect}
        inputRef={inputRef}
      >
        <option value="">value</option>
        <option value="median">median</option>
        <option value="mean">mean</option>
        <option value="sum">sum</option>
        <option value="min">min</option>
        <option value="max">max</option>
        <option value="mode">mode</option>
      </FormControl>
    </div>
  );
};

MathExpression.propTypes = {
  onChange: PropTypes.func,
  defaultValue: PropTypes.string,
  inputRef: PropTypes.func,
};
