import React from 'react';
import PropTypes from 'prop-types';

export const KuiTableBody = ({ children, className, ...rest }) => {
  return (
    <tbody className={className} {...rest}>
      { children }
    </tbody>
  );
};
KuiTableBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
