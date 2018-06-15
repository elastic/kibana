import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow } from '@elastic/eui';
import { ColorPickerMini } from '../color_picker_mini';

export const PageConfig = ({ setBackground, background }) => {
  return (
    <EuiFormRow label="Page Background">
      <ColorPickerMini onChange={setBackground} value={background} />
    </EuiFormRow>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
};
