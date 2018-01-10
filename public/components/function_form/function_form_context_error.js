import React from 'react';
import PropTypes from 'prop-types';

export const FunctionFormContextError = ({ context }) => <div>ERROR: {context.error}</div>;

FunctionFormContextError.propTypes = {
  context: PropTypes.object,
};
