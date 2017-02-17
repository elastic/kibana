import React from 'react';
import _ from 'lodash';

export default ({interval, onChange}) => {
  const change = (e) => onChange(e.target.value);
  const options = _.map(['none', 'auto', '1s', '1m', '1h', '1d', '1w', '1M', '1y'], (opt) => (
    <option key={opt} value={opt}>{opt}</option>
  ));
  return (
    <select className="form-control rework--timelion--interval" onChange={change} value={interval}>
      {options}
    </select>
  );
};
