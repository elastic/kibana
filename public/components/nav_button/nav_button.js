import React from 'react';
import './nav_button.less';
import classnames from 'classnames';
import ReactTooltip from 'react-tooltip';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';

export default React.createClass({
  render() {
    const {className, onClick, tooltip} = this.props;

    return (
      <div className='rework--nav-button'>
        <Tooltip content={tooltip}>
          <a
            className={className}
            onClick={onClick}
            >
            {this.props.children}
          </a>
        </Tooltip>
      </div>
    );
  }
});
