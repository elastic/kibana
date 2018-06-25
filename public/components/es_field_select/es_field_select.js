import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';

export const ESFieldSelect = ({ value = '_score', fields, onChange, onFocus, onBlur }) => {
  const options = [{ value: '_score', text: '_score' }];
  fields.forEach(value => options.push({ value, text: value }));

  return (
    <EuiSelect
      defaultValue={value}
      options={options}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
};

ESFieldSelect.propTypes = {
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  value: PropTypes.string,
  fields: PropTypes.array,
};
