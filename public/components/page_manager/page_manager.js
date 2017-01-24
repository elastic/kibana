import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import './page_manager.less';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import { Popover, PopoverContent, PopoverTitle } from 'reactstrap';
import PageProperties from 'plugins/rework/components/page_properties/page_properties';
import WorkpadProperties from 'plugins/rework/components/page_properties/page_properties';


export default React.createClass({
  getInitialState() {
    return {configPopover: false};
  },
  toggleConfig() {
    this.setState({
      configPopover: !this.state.configPopover
    });
  },
  render() {
    const { add, remove, pageCount, page, workpad, onPageChange, onWorkpadChange } = this.props;
    const removeClasses = ['rework--page-manager-remove', 'fa', 'fa-ban'];
    if (pageCount === 1) removeClasses.push('rework--page-manager-no-remove');
    return (
      <div className="rework--page-manager">
        <Tooltip content="Configure" place="top">
          <a className="rework--page-manager-config fa fa-cog" id="configPopover" onClick={this.toggleConfig}></a>
        </Tooltip>

        <Tooltip content="Add Page" place="top">
          <a className="rework--page-manager-add fa fa-plus-circle" onClick={add}></a>
        </Tooltip>

        <Tooltip content="Remove Page" place="top">
          <a className={removeClasses.join(' ')} onClick={remove}></a>
        </Tooltip>

        <Popover placement="bottom" isOpen={this.state.configPopover} target="configPopover" toggle={this.toggle}>
          <PopoverContent>
            <PageProperties onChange={onPageChange} page={page}></PageProperties>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
});
