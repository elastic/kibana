import React from 'react';
import PropTypes from 'prop-types';

export const Tray = ({ children }) => {
  return <div className="canvas__tray">{children}</div>;
};

Tray.propTypes = {
  children: PropTypes.node,
};
