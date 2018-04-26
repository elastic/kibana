import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTable = ({ children, shrinkToContent, className, ...rest }) => {
  const classes = classNames('kuiTable', className, {
    'kuiTable--fluid': shrinkToContent
  });
  return <table className={classes} {...rest} >{children}</table>;
};
KuiTable.propTypes = {
  shrinkToContent: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};
KuiTable.defaultProps = {
  shrinkToContent: false
};
