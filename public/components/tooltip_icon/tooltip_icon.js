import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiIconTip } from '@elastic/eui';

export const TooltipIcon = ({ icon = 'info', text, placement }) => {
  const icons = {
    error: { type: 'alert', color: 'danger' },
    warning: { type: 'alert', color: 'warning' },
    info: { type: 'iInCircle', color: 'default' },
  };

  if (!Object.keys(icons).includes(icon)) throw new Error('Unsupported icon type');

  return (
    <EuiIconTip
      type={icons[icon].type}
      color={icons[icon].color}
      content={text}
      position={placement}
    />
  );
};

TooltipIcon.propTypes = {
  icon: PropTypes.string,
  text: PropTypes.string.isRequired,
  placement: PropTypes.string,
};
