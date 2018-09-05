import React from 'react';
import PropTypes from 'prop-types';
import { DatetimeCalendar } from '../datetime_calendar';
import './datetime_range_absolute.scss';

export const DatetimeRangeAbsolute = ({ from, to, onSelect }) => (
  <div className="canvasDateTimeRangeAbsolute">
    <div>
      <DatetimeCalendar
        value={from}
        startDate={from}
        endDate={to}
        onSelect={val => onSelect(val, to)}
      />
    </div>
    <div>
      <DatetimeCalendar
        value={to}
        startDate={from}
        endDate={to}
        onSelect={val => onSelect(from, val)}
      />
    </div>
  </div>
);

DatetimeRangeAbsolute.propTypes = {
  from: PropTypes.object, // a moment
  to: PropTypes.object, // a moment
  onSelect: PropTypes.func,
};
