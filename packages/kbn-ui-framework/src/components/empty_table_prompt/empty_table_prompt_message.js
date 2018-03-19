import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiEmptyTablePromptMessage = ({ children, className, ...rest }) => {
  const classes = classNames('kuiEmptyTablePrompt__message', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiEmptyTablePromptMessage.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
