import React from 'react';
import PropTypes from 'prop-types';
import { EuiComboBox } from '@elastic/eui';
import { get } from 'lodash';

const defaultField = '_score';

export const ESFieldSelect = ({ value, fields = [], onChange, onFocus, onBlur }) => {
  const selectedOption = value !== defaultField ? [{ label: value }] : [];
  const options = fields.map(field => ({ label: field }));

  return (
    <EuiComboBox
      selectedOptions={selectedOption}
      placeholder={defaultField}
      options={options}
      onChange={([field]) => onChange(get(field, 'label', defaultField))}
      onSearchChange={searchValue => {
        // resets input when user starts typing
        if (searchValue) onChange(defaultField);
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

ESFieldSelect.defaultProps = {
  value: defaultField,
};
