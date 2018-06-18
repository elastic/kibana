import React from 'react';
import PropTypes from 'prop-types';

export const Navbar = ({ children }) => {
  return <div className="canvas__navbar">{children}</div>;
};

Navbar.propTypes = {
  children: PropTypes.node,
};
