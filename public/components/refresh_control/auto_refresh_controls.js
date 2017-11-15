import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { timeDurationString } from '../../lib/time_duration';

const showIntervalValue = (refreshInterval, doDisable) => {
  if (refreshInterval > 0) {
    return (
      <div>
        Interval: {timeDurationString(refreshInterval)}
        <Button bsStyle="link" bsSize="xsmall" onClick={doDisable}>Disable</Button>
      </div>
    );
  }

  return (
    <div>Interval: disabled</div>
  );
};

export const AutoRefreshControls = ({ refreshInterval, setRefresh, disableInterval }) => {
  let refreshInput;

  return (
    <div>
      {showIntervalValue(refreshInterval, disableInterval)}

      <div className="canvas__refresh_control--auto-refresh--preset-intervals">
        <div className="items">
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(5000)}>5 Seconds</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(15000)}>15 Seconds</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(30000)}>30 Seconds</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(60000)}>1 Minute</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(300000)}>5 Minutes</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(900000)}>15 Minutes</Button>
        </div>
        <div className="items">
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(1800000)}>30 Minutes</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(3600000)}>1 Hour</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(7200000)}>2 Hours</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(21600000)}>6 Hours</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(43200000)}>12 Hours</Button>
          <Button bsStyle="link" bsSize="xsmall" onClick={() => setRefresh(86400000)}>24 Hours</Button>
        </div>
      </div>

      <div>
        <form onSubmit={(ev) => { ev.preventDefault; setRefresh(refreshInput.value); }}>
          Interval: <input type="text" ref={i => refreshInput = i} />
          <Button bsSize="xsmall" type="submit">Set</Button>
        </form>
      </div>
    </div>
  );
};

AutoRefreshControls.propTypes = {
  refreshInterval: PropTypes.number,
  setRefresh: PropTypes.func.isRequired,
  disableInterval: PropTypes.func.isRequired,
};
