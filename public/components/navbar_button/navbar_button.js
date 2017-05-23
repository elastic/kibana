import React from 'react';
import PropTypes from 'prop-types';
import './navbar_button.less';

export const NavbarButton = ({ children }) => {

  return (
    <button className="canvas__navbarButton">
      {children}
    </button>
  );
};

NavbarButton.propTypes = {
  children: PropTypes.node,
};
