import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow } from '@elastic/eui';
import { ColorPickerMini } from '../color_picker_mini';

export const PageConfig = ({ setBackground, background }) => {
  return (
    <EuiFormRow label="Page Background">
      <span style={{ fontSize: 0, width: 'fit-content' }}>
        <ColorPickerMini id="page-config" onChange={setBackground} value={background} />
      </span>
    </EuiFormRow>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
};
