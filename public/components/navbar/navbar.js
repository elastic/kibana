import React from 'react';
import PropTypes from 'prop-types';
import './navbar.less';

export const Navbar = ({ children }) => {

  return (
    <div className="canvas__navbar">
      {children}
    </div>
  );
};

Navbar.propTypes = {
  children: PropTypes.node,
};
