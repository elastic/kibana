import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiEmptyTablePromptPanel = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPanel kuiPanel--centered kuiPanel--withToolBar', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiEmptyTablePromptPanel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
