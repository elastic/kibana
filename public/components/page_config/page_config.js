import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiTitle, EuiSpacer } from '@elastic/eui';
import { ColorPickerMini } from '../color_picker_mini';

export const PageConfig = ({ setBackground, background }) => {
  return (
    <Fragment>
      <EuiTitle size="xs">
        <h4>Page</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow label="Background">
        <ColorPickerMini onChange={setBackground} value={background} />
      </EuiFormRow>
    </Fragment>
  );
};

PageConfig.propTypes = {
  background: PropTypes.string,
  setBackground: PropTypes.func,
};
