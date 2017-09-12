import React from 'react';
import PropTypes from 'prop-types';
import Datetime from 'react-datetime';
import 'react-datetime/css/react-datetime.css';
import './datetime_calendar.less';
import dateMath from '@elastic/datemath';
import { DatetimeInput } from '../datetime_input';

export const DatetimeCalendar = ({ value, onSelect }) => (
  <div className="canvas__datetime-calendar">
    <DatetimeInput moment={dateMath.parse(value)} setMoment={onSelect}/>
    <Datetime
      value={value}
      input={false}
      onChange={onSelect}
    />
  </div>
);

DatetimeCalendar.propTypes = {
  value: PropTypes.object,
  onSelect: PropTypes.func, // Called with a moment
};
