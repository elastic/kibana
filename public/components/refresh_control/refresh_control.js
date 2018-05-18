import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiIcon, EuiButtonIcon, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { AutoRefreshControls } from './auto_refresh_controls';
import './refresh_control.less';

const refreshClass = active => {
  const baseClass = 'canvas__refresh_control--refresh';
  return active ? `${baseClass} canvas__in_flight` : baseClass;
};

const autoClass = active => {
  const baseClass = 'canvas__refresh_control--auto-refresh';
  return Boolean(active) ? `${baseClass} canvas__auto_refresh` : baseClass;
};

const getRefreshInterval = (val = '') => {
  // if it's a number, just use it directly
  if (!isNaN(Number(val))) {
    return val;
  }

  // if it's a string, try to parse out the shorthand duration value
  const match = String(val).match(/^([0-9]{1,})([hmsd])$/);

  // TODO: do something better with improper input, like show an error...
  if (!match) return;

  switch (match[2]) {
    case 's':
      return match[1] * 1000;
    case 'm':
      return match[1] * 1000 * 60;
    case 'h':
      return match[1] * 1000 * 60 * 60;
    case 'd':
      return match[1] * 1000 * 60 * 60 * 24;
  }
};

export class RefreshControl extends PureComponent {
  state = {
    isPopoverOpen: false,
  };

  handleClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const { inFlight, doRefresh, setRefreshInterval, refreshInterval } = this.props;
    const setRefresh = val => setRefreshInterval(getRefreshInterval(val));

    const popoverButton = (
      <EuiButtonIcon
        iconType="arrowDown"
        size="m"
        className={autoClass(refreshInterval)}
        onClick={this.handleClick}
        aria-label="Auto Refresh Popover"
      />
    );

    const autoRefreshControls = (
      <EuiPopover
        id="auto-refresh-popover"
        ownFocus
        button={popoverButton}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        withTitle
        panelClassName="canvas__refresh_control--popover"
      >
        <EuiPopoverTitle>Workpad Auto Refresh</EuiPopoverTitle>
        <AutoRefreshControls
          refreshInterval={refreshInterval}
          setRefresh={setRefresh}
          disableInterval={() => setRefresh(0)}
        />
      </EuiPopover>
    );

    return (
      <span className={`canvas__refresh_control`}>
        <EuiIcon
          type="refresh"
          size="xl"
          className={`${refreshClass(inFlight)}`}
          onClick={doRefresh}
        />
        {autoRefreshControls}
      </span>
    );
  }
}

RefreshControl.propTypes = {
  inFlight: PropTypes.bool.isRequired,
  doRefresh: PropTypes.func.isRequired,
  refreshInterval: PropTypes.number,
  setRefreshInterval: PropTypes.func.isRequired,
};
