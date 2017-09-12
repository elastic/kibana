import React from 'react';
import PropTypes from 'prop-types';
import dateMath from '@elastic/datemath';
import { PrettyDuration } from '../pretty_duration';
import { Button, Popover, OverlayTrigger } from 'react-bootstrap';
import { DatetimeRangeAbsolute } from '../datetime_range_absolute';
import { DatetimeQuickList } from '../datetime_quick_list';
import moment from 'moment';
import './time_picker.less';


//import { fromExpression, toExpression } from '../../../../../common/lib/ast';
//import { set } from 'lodash';

/*
function setFilterArgument(filter, argumentName, value) {
  return toExpression(
    set(
      fromExpression(filter),
      ['chain', 0, 'arguments', argumentName, 0],
      { type: 'string', value }
    )
  );
}
*/

export const quickRanges = [
  { from: 'now-24h',  to: 'now',      display: 'Last 24 hours' },
  { from: 'now-7d',   to: 'now',      display: 'Last 7 days'   },
  { from: 'now-14d',   to: 'now',     display: 'Last 2 weeks'   },
  { from: 'now-30d',  to: 'now',      display: 'Last 30 days'  },
  { from: 'now-90d',  to: 'now',      display: 'Last 90 days'  },
  { from: 'now-1y',   to: 'now',      display: 'Last 1 year'   },
];

export const TimePicker = ({ from, to, /*onChange,*/ onSelect }) => {
  function momentSelect(from, to) {
    onSelect(moment(from).toISOString(), moment(to).toISOString());
  }

  const pickContent = (
    <div className="canvas__time_picker">
      <DatetimeRangeAbsolute from={dateMath.parse(from)} to={dateMath.parse(to)} onSelect={momentSelect}/>
      <DatetimeQuickList ranges={quickRanges} onSelect={onSelect}/>
    </div>

  );

  return pickContent;

  const picker = (
    <Popover id="timefilter-popover-trigger-click">
      <div className="canvas">
        {pickContent}
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
      <Button>
        <PrettyDuration from={from} to={to}/>
      </Button>
    </OverlayTrigger>

  );
};

TimePicker.propTypes = {
  onChange: PropTypes.func,
  from: PropTypes.string,
  to: PropTypes.string,
  onSelect: PropTypes.func,
};
