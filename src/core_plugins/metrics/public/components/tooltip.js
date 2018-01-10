import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';

function TooltipComponent(props) {
  const tooltip = (
    <Tooltip>{ props.text }</Tooltip>
  );
  return (
    <OverlayTrigger placement={props.placement} overlay={tooltip}>
      { props.children}
    </OverlayTrigger>
  );
}

TooltipComponent.defaultProps = {
  placement: 'top',
  text: 'Tip!'
};

TooltipComponent.propTypes = {
  placement: PropTypes.string,
  text: PropTypes.node
};

export default TooltipComponent;
