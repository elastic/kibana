import React from 'react';
import PropTypes from 'prop-types';
import { EuiComboBox } from '@elastic/eui';
import { get } from 'lodash';

export const ESFieldSelect = ({ value, fields = [], onChange, onFocus, onBlur }) => {
  const selectedOption = value ? [{ label: value }] : [];
  const options = fields.map(field => ({ label: field }));

  return (
    <EuiComboBox
      selectedOptions={selectedOption}
      options={options}
      onChange={([field]) => onChange(get(field, 'label', null))}
      onSearchChange={searchValue => {
        // resets input when user starts typing
        if (searchValue) onChange(null);
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      singleSelection
      isClearable={false}
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
