import React from 'react';
import PropTypes from 'prop-types';

export const FunctionUnknown = ({ argType }) => <div>Unknown expression type "{argType}"</div>;

FunctionUnknown.propTypes = {
  argType: PropTypes.string,
};
