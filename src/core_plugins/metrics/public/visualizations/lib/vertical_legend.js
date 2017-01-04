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
    const seriesStyle = {};
    const legendStyle = {};
    const controlStyle = {};
    let openClass = 'fa-chevron-left';
    let closeClass = 'fa-chevron-right';
    if (this.props.legendPosition === 'left') {
      openClass = 'fa-chevron-right';
      closeClass = 'fa-chevron-left';
      legendStyle.order = '-1';
      controlStyle.order = '2';
    }
    let legendControlClass = `fa ${closeClass}`;
    legendStyle.width = 200;
    if (!this.props.showLegend) {
      legendStyle.width = 12;
      seriesStyle.display = 'none';
      legendControlClass = `fa ${openClass}`;
    }
    return (
      <div className="rhythm_chart__legend" style={legendStyle}>
        <div className="rhythm_chart__legend-control" style={controlStyle}>
          <i className={legendControlClass} onClick={this.props.onClick}/>
        </div>
        <div className="rhythm_chart__legend-series" style={seriesStyle}>
          { rows }
        </div>
      </div>
    );
  }
});
