import React from 'react';
import PropTypes from 'prop-types';

export const AppError = ({ appReady: error }) => (
  <div>
    <div>App failed to load :(</div>
    <div>{error.message}</div>
  </div>
);

AppError.propTypes = {
  appReady: PropTypes.object.isRequired,
};
