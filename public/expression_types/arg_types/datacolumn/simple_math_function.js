import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';

export const SimpleMathFunction = ({ onChange, value, inputRef }) => {
  const options = [
    { text: 'Value', value: '' },
    { text: 'Average', value: 'mean' },
    { text: 'Sum', value: 'sum' },
    { text: 'Count', value: 'size' },
    { text: 'Max', value: 'max' },
    { text: 'Min', value: 'min' },
    { text: 'Median', value: 'median' },
  ];

  return (
    <EuiSelect
      options={options}
      inputRef={inputRef}
      defaultValue={value || ''}
      onChange={onChange}
    />
  );
};

SimpleMathFunction.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
  inputRef: PropTypes.func,
};
