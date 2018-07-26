import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { PropTypes } from 'prop-types';

export const TooltipComponent = ({
  children,
  content,
  placement,
  className,
  anchorClassName,
  ...rest
}) => (
  <EuiToolTip
    position={placement}
    content={content}
    anchorClassName={anchorClassName}
    className={className}
    {...rest}
  >
    {children}
  </EuiToolTip>
);

TooltipComponent.propTypes = {
  children: PropTypes.node.isRequired,
  content: PropTypes.string.isRequired,
  placement: PropTypes.string,
  className: PropTypes.string,
  anchorClassName: PropTypes.string,
};
