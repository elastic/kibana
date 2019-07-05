import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const <%= componentName %> = ({
  children,
  className,
  ...rest
}) => {
  const classes = classNames('<%= cssClassName %>', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

<%= componentName %>.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
