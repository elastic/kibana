import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTabs = ({
  children,
  className,
  ...rest
}) => {
  const classes = classNames('kuiTabs', className);

  return (
    <div
      role="tablist"
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiTabs.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};
