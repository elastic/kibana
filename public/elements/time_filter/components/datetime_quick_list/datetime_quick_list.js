import React from 'react';
import PropTypes from 'prop-types';
import 'react-datetime/css/react-datetime.css';

export const DatetimeQuickList = ({ from, to, ranges, onSelect }) => (
  <div>
    <ul className="nav nav-pills nav-stacked">
      {ranges.map((range, i) => (
        <li
          className={(from === range.from && to === range.to) ? 'active' : null}
          key={i}
          onClick={() => onSelect(range.from, range.to)}>
          <a>{range.display}</a>
        </li>
      ))}
    </ul>
  </div>
);

DatetimeQuickList.propTypes = {
  from: PropTypes.string,
  to: PropTypes.string,
  ranges: PropTypes.array,
  onSelect: PropTypes.func,
};
