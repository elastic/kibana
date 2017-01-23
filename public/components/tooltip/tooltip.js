import React from 'react';
import RcTooltip from 'rc-tooltip';
import './tooltip.less';
import 'rc-tooltip/assets/bootstrap.css';


export default React.createClass({
  render() {
    const {content} = this.props;
    const place = this.props.place || 'bottom';

    const tooltipContent = (<span>{content}</span>);

    return (
      <RcTooltip
        placement={place}
        overlay={tooltipContent}
        mouseLeaveDelay={0}>
        {this.props.children}
      </RcTooltip>
    );
  }
});
