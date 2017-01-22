import React from 'react';
import './nav_button.less';
import classnames from 'classnames';
import ReactTooltip from 'react-tooltip';

export default React.createClass({
  render() {
    const {className, onClick, tooltip} = this.props;

    return (
      <div className='rework--nav-button'>
        <a data-tip={tooltip} className={className} onClick={onClick}>{this.props.children}</a>
        <ReactTooltip type='dark' effect='solid' />
      </div>
    );
  }
});
