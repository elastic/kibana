import React from 'react';
import _ from 'lodash';
export default props => (row, i) => {

  function tickFormatter(value) {
    if (_.isFunction(props.tickFormatter)) return props.tickFormatter(value);
    return value;
  }

  const formatter = row.tickFormatter || tickFormatter;
  const value = formatter(props.seriesValues[row.id]);
  const classes = ['rhythm_chart__legend_item'];
  const key = row.id;
  if (!_.includes(props.seriesFilter, row.id)) classes.push('disabled');
  if (row.label == null || row.legend === false) return (<div key={ key } style={{ display: 'none' }}/>);
  return (
    <div
      className={ classes.join(' ') }
      onClick={ event => props.onToggle(event, row.id) }
      key={ key }>
      <div className="rhythm_chart__legend_label">
        <i className="fa fa-circle" style={{ color: row.color }}></i>
        <span>{ row.label }</span>
      </div>
      <div className="rhythm_chart__legend_value">{ value }</div>
    </div>
  );
};
