import React from 'react';
import PropTypes from 'prop-types';

export const ArgTypeContextError = ({ context }) => (
  <div>ERROR: {context.error}</div>
);

ArgTypeContextError.propTypes = {
  context: PropTypes.object,
};
