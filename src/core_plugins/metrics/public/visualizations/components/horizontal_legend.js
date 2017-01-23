import React from 'react';
import _ from 'lodash';
export default React.createClass({

  formatter(value) {
    if (_.isFunction(this.props.tickFormatter)) return this.props.tickFormatter(value);
    return value;
  },

  createSeries(row, i) {
    const formatter = row.tickFormatter || this.formatter;
    const value = formatter(this.props.seriesValues[row.id]);
    const classes = ['rhythm_chart__legend_item'];
    const key = row.id;
    if (!_.includes(this.props.seriesFilter, row.id)) classes.push('disabled');
    if (!row.label || row.legend === false) return (<div key={ key } style={{ display: 'none' }}/>);
    return (
      <div
        className={ classes.join(' ') }
        onClick={ event => this.props.onToggle(event, row.id) }
        key={ key }>
        <div className="rhythm_chart__legend_label">
          <i className="fa fa-circle" style={{ color: row.color }}></i>
          <span>{ row.label }</span>
        </div>
        <div className="rhythm_chart__legend_value">{ value }</div>
      </div>
    );
  },

  render() {
    const rows = this.props.series.map(this.createSeries);
    const legendStyle = { };
    let legendControlClass = 'fa fa-chevron-down';
    if (!this.props.showLegend) {
      legendStyle.display = 'none';
      legendControlClass = 'fa fa-chevron-up';
    }
    return (
      <div className="rhythm_chart__legend-horizontal">
        <div className="rhythm_chart__legend-control">
          <i className={legendControlClass} onClick={this.props.onClick}/>
        </div>
        <div className="rhythm_chart__legend-series" style={legendStyle}>
          { rows }
        </div>
      </div>
    );
  }
});

