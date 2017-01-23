import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import './page_manager.less';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';

export default React.createClass({
  render() {
    const { add, remove } = this.props;

    return (
      <div className="rework--page-manager">
        <Tooltip content="Add Page" place="top">
          <i className="rework--page-manager-add fa fa-plus-circle" onClick={add}></i>
        </Tooltip>

        <Tooltip content="Remove Page" place="top">
          <i className="rework--page-manager-remove fa fa-ban" onClick={remove}></i>
        </Tooltip>
      </div>
    );
  }
});
