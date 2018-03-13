import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTab = ({ isSelected, onClick, children, className, ...rest }) => {
  const classes = classNames('kuiTab', className, {
    'kuiTab-isSelected': isSelected
  });

  return (
    <button
      role="tab"
      aria-selected={!!isSelected}
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

KuiTab.defaultProps = {
  isSelected: false,
};

KuiTab.propTypes = {
  isSelected: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
};
