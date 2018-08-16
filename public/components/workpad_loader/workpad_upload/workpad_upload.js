import React from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';

export const WorkpadUpload = ({
  isDropping,
  setDropping,
  onDropAccepted,
  onDropRejected,
  children,
}) => (
  <Dropzone
    accept="application/json"
    onDropAccepted={onDropAccepted}
    onDropRejected={onDropRejected}
    onDragEnter={() => setDropping(true)}
    onDragLeave={() => setDropping(false)}
    disableClick
    style={{ border: isDropping ? '2px dashed' : '2px solid transparent' }}
  >
    {children}
  </Dropzone>
);

WorkpadUpload.propTypes = {
  isDropping: PropTypes.bool.isRequired,
  setDropping: PropTypes.func.isRequired,
  onDropAccepted: PropTypes.func.isRequired,
  onDropRejected: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};
