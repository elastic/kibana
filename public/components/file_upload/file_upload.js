import React from 'react';
import PropTypes from 'prop-types';
import { EuiFilePicker } from '@elastic/eui';

export const FileUpload = ({ id = '', className = 'canvasFileUpload', onUpload }) => (
  <EuiFilePicker compressed id={id} className={className} onChange={onUpload} />
);

FileUpload.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  onUpload: PropTypes.func.isRequired,
};
