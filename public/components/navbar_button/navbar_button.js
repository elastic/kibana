import React from 'react';
import PropTypes from 'prop-types';
import './navbar_button.less';

export const NavbarButton = ({ children, onClick, className, disabled }) => {
  const onClickHandler = ev => {
    if (disabled) return;
    onClick(ev);
  };

  return (
    <button
      disabled={disabled}
      className={`canvas__navbarButton ${className || ''}`}
      onClick={onClickHandler}
    >
      {children}
    </button>
  );
};

NavbarButton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
