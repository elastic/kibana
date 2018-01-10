import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

export const ESIndexSelect = ({ value = '_all', loading, indices, onChange }) => (
  <FormControl
    componentClass="select"
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={loading}
  >
    <option value="_all">_all</option>
    {indices.map(index => (
      <option key={index} value={index}>
        {index}
      </option>
    ))}
  </FormControl>
);

ESIndexSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  indices: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
};
