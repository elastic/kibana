import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import { PropTypes } from 'prop-types';

export const TooltipComponent = ({ children, text, placement = 'top' }) => {
  const tooltip = <Tooltip id="tooltip">{text}</Tooltip>;

  return (
    <OverlayTrigger placement={placement} overlay={tooltip}>
      {children}
    </OverlayTrigger>
  );
};

TooltipComponent.propTypes = {
  children: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  placement: PropTypes.string,
};
