import React from 'react';
import PropTypes from 'prop-types';
import dateMath from '@elastic/datemath';
import { Button } from 'react-bootstrap';
import { DatetimeRangeAbsolute } from '../datetime_range_absolute';
import { DatetimeQuickList } from '../datetime_quick_list';
import moment from 'moment';
import './time_picker.less';

export const quickRanges = [
  { from: 'now-24h',  to: 'now',      display: 'Last 24 hours' },
  { from: 'now-7d',   to: 'now',      display: 'Last 7 days'   },
  { from: 'now-14d',   to: 'now',     display: 'Last 2 weeks'   },
  { from: 'now-30d',  to: 'now',      display: 'Last 30 days'  },
  { from: 'now-90d',  to: 'now',      display: 'Last 90 days'  },
  { from: 'now-1y',   to: 'now',      display: 'Last 1 year'   },
];

export const TimePicker = ({ range, setRange, dirty, setDirty, onSelect }) => {
  const { from, to } = range;

  function absoluteSelect(from, to) {
    setDirty(true);
    setRange({ from: moment(from).toISOString(), to: moment(to).toISOString() });
  }

  return (
    <div className="canvas__time-picker">
      <DatetimeRangeAbsolute from={dateMath.parse(from)} to={dateMath.parse(to)} onSelect={absoluteSelect}/>
      <div>
        <DatetimeQuickList from={range.from} to={range.to} ranges={quickRanges} onSelect={onSelect}/>
        <Button
          bsStyle="success"
          disabled={!dirty}
          className="canvas__time-picker--apply"
          onClick={ () => { setDirty(false); onSelect(range.from, range.to); } }>
          Apply
        </Button>
      </div>
    </div>
  );
};

TimePicker.propTypes = {
  range: PropTypes.object,
  setRange: PropTypes.func,
  dirty: PropTypes.bool,
  setDirty: PropTypes.func,
  onSelect: PropTypes.func,
};
