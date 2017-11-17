import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Popover } from 'react-bootstrap';
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

export const RefreshControl = (props) => {
  const { inFlight, doRefresh, setRefreshInterval, refreshInterval, className } = props;
  const setRefresh = val => setRefreshInterval(getRefreshInterval(val));

  const autoRefreshControls = (
    <Popover id="auto-refresh-popover" title="Workpad Auto Refresh">
      <AutoRefreshControls
        refreshInterval={refreshInterval}
        setRefresh={setRefresh}
        disableInterval={() => setRefresh(0)}
      />
    </Popover>
  );

  return (
    <span className={`canvas__refresh_control ${className}`}>
      <i className={`fa fa-refresh ${refreshClass(inFlight)}`} onClick={doRefresh} />
      <OverlayTrigger trigger="click" rootClose placement="bottom" overlay={autoRefreshControls}>
        <i className={`fa fa-caret-down ${autoClass(refreshInterval)}`} />
      </OverlayTrigger>
    </span>
  );
};

RefreshControl.propTypes = {
  className: PropTypes.string,
  inFlight: PropTypes.bool.isRequired,
  doRefresh: PropTypes.func.isRequired,
  refreshInterval: PropTypes.number,
  setRefreshInterval: PropTypes.func.isRequired,
};
