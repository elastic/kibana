import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { PropTypes } from 'prop-types';

export const TooltipComponent = ({ children, text, placement = 'top' }) => (
  <EuiToolTip position={placement} content={text}>
    {children}
  </EuiToolTip>
);

TooltipComponent.propTypes = {
  children: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  placement: PropTypes.string,
};
