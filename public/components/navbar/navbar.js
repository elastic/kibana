import React from 'react';
import PropTypes from 'prop-types';

export const Navbar = ({ children }) => {
  return <div className="canvasNavbar">{children}</div>;
};

Navbar.propTypes = {
  children: PropTypes.node,
};
