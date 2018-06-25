import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';

export const ESIndexSelect = ({ value = '_all', loading, indices, onChange, onFocus, onBlur }) => {
  const options = [{ value: '_all', text: '_all' }];

  indices.forEach(index => options.push({ value: index, name: index }));

  return (
    <EuiSelect
      defaultValue={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      disabled={loading}
      options={options}
    />
  );
};

ESIndexSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  indices: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
};
