import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

export const ESIndexSelect = ({ value = '_all', indices, onChange }) => (
  <FormControl
    componentClass="select"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="_all">_all</option>
    {indices.map(index => (
      <option key={index} value={index}>{index}</option>
    ))}
  </FormControl>
);

ESIndexSelect.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  indices: PropTypes.array,
};
