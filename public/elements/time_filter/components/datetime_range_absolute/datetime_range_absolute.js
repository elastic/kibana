import React from 'react';
import PropTypes from 'prop-types';
import { DatetimeCalendar } from '../datetime_calendar';
import './datetime_range_absolute.less';

export const DatetimeRangeAbsolute = ({ from, to, onSelect }) => (
  <div className="canvas__datetime-range-absolute">
    <div>
      <DatetimeCalendar value={from} onSelect={val => onSelect(val, to)}/>
    </div>
    <div>
      <DatetimeCalendar value={to} onSelect={val => onSelect(from, val)}/>
    </div>
  </div>

);

DatetimeRangeAbsolute.propTypes = {
  from: PropTypes.object, // a moment
  to: PropTypes.object, // a moment
  onSelect: PropTypes.func,
};
