import React from 'react';
import PropTypes from 'prop-types';

export const ArgTypeUnknown = ({ argType }) => (
  <div>Unknown expression type "{argType}"</div>
);

ArgTypeUnknown.propTypes = {
  argType: PropTypes.string,
};
