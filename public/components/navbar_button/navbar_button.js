import React from 'react';
import PropTypes from 'prop-types';
import './navbar_button.less';

export const NavbarButton = ({ children, onClick }) => {

  return (
    <button className="canvas__navbarButton" onClick={onClick}>
      {children}
    </button>
  );
};

NavbarButton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
};
