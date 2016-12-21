import React from 'react';
import { Tooltip } from 'pui-react-tooltip';
import { OverlayTrigger } from 'pui-react-overlay-trigger';
export default React.createClass({

  getDefaultProps() {
    return { placement: 'top', text: 'tip!' };
  },

  render() {
    const tooltip = (
      <Tooltip>{ this.props.text }</Tooltip>
    );
    return (
      <OverlayTrigger placement={this.props.placement} overlay={tooltip}>
        { this.props.children}
      </OverlayTrigger>
    );
  }

});
