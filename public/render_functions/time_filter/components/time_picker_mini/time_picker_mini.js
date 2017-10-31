import React from 'react';
import PropTypes from 'prop-types';
import { PrettyDuration } from '../pretty_duration';
import { Button, Popover, OverlayTrigger } from 'react-bootstrap';
import { TimePicker } from '../time_picker';

export const TimePickerMini = ({ from, to, onSelect }) => {

  const picker = (
    <Popover id="timefilter-popover-trigger-click">
      <div className="canvas">
        <TimePicker from={from} to={to} onSelect={onSelect}/>
      </div>
    </Popover>
  );

  return (
    <OverlayTrigger
      rootClose
      overlay={picker}
      placement={'bottom'}
      trigger="click"
    >
      <Button style={{ width: '100%' }}>
        <PrettyDuration from={from} to={to}/>
      </Button>
    </OverlayTrigger>

  );
};

TimePickerMini.propTypes = {
  from: PropTypes.string,
  to: PropTypes.string,
  onSelect: PropTypes.func,
};
