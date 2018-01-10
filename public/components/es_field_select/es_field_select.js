import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

export const ESFieldSelect = ({ value = '_score', fields, onChange }) => (
  <FormControl componentClass="select" value={value} onChange={e => onChange(e.target.value)}>
    <option value="_score">_score</option>
    {fields.map(field => (
      <option key={field} value={field}>
        {field}
      </option>
    ))}
  </FormControl>
);

ESFieldSelect.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  fields: PropTypes.array,
};
