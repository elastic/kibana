import React, { PropTypes } from 'react';
import { Tooltip } from 'pui-react-tooltip';
import { OverlayTrigger } from 'pui-react-overlay-trigger';

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
