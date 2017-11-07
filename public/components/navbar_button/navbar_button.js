import React from 'react';
import PropTypes from 'prop-types';
import './navbar_button.less';

export const NavbarButton = ({ children, onClick, className }) => {

  return (
    <button className={`canvas__navbarButton ${className}`} onClick={onClick}>
      {children}
    </button>
  );
};

NavbarButton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  className: PropTypes.string,
};
