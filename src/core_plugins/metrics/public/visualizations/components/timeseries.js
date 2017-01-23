import _ from 'lodash';
import numeral from 'numeral';
import React, { Component } from 'react';
import $ from '../lib/flot';
import getLastValue from '../lib/get_last_value';
import TimeseriesChart from './timeseries_chart';
import Legend from './legend';
import eventBus from '../lib/events';
export default React.createClass({
  getInitialState() {
    const values = this.getLastValues();
    return {
      showLegend: this.props.legend != null ? this.props.legend : true,
      values: values || {},
      show: _.keys(values) || [],
      ignoreLegendUpdates: false,
      ignoreVisabilityUpdates: false
    };
  },

  getDefaultProps() {
    return { legend: true };
  },

  filterLegend(id) {
    if (!_.has(this.state.values, id)) return [];
    const notAllShown = _.keys(this.state.values).length !== this.state.show.length;
    const isCurrentlyShown = _.includes(this.state.show, id);
    const show = [];
    if (notAllShown && isCurrentlyShown) {
      this.setState({ ignoreVisabilityUpdates: false, show: Object.keys(this.state.values) });
    } else {
      show.push(id);
      this.setState({ ignoreVisabilityUpdates: true, show: [id] });
    }
    return show;
  },

  toggleFilter(event, id) {
    const show = this.filterLegend(id);
    if (_.isFunction(this.props.onFilter)) {
      this.props.onFilter(show);
    }
    eventBus.trigger('toggleFilter', id, this);
  },

  getLastValues(props) {
    props = props || this.props;
    const values = {};
    props.series.forEach((row) => {
      // we need a valid identifier
      if (!row.id) row.id = row.label;
      values[row.id] = getLastValue(row.data);
    });
    return values;
  },

  updateLegend(pos, item) {
    const values = {};
    if (pos) {
      this.props.series.forEach((row) => {
        if (row.data && _.isArray(row.data)) {
          if (item && row.data[item.dataIndex] && row.data[item.dataIndex][0] === item.datapoint[0]) {
            values[row.id] = row.data[item.dataIndex][1];
          } else {
            let closest;
            for (let i = 0; i < row.data.length; i++) {
              closest = i;
              if (row.data[i] && pos.x < row.data[i][0]) break;
            }
            if (!row.data[closest]) return values[row.id] = null;
            const [ time, value ] = row.data[closest];
            values[row.id] = value != null && value || null;
          }
        }
      });
    } else {
      _.assign(values, this.getLastValues());
    }

    this.setState({ values });
  },


  componentWillReceiveProps(props) {
    if (props.legend !== this.props.legend) this.setState({ showLegend: props.legend });
    if (!this.state.ignoreLegendUpdates) {
      const values = this.getLastValues(props);
      const currentKeys = _.keys(this.state.values);
      const keys = _.keys(values);
      const diff = _.difference(keys, currentKeys);
      const nextState = { values: values };
      if (diff.length && !this.state.ignoreVisabilityUpdates) {
        nextState.show = keys;
      }
      this.setState(nextState);
    }
  },

  plothover(event, pos, item) {
    this.updateLegend(pos, item);
  },

  handleHideClick() {
    this.setState({ showLegend: !this.state.showLegend });
  },

  render() {
    let className = 'rhythm_chart';
    if (this.props.reversed) {
      className += ' reversed';
    }
    const style = {};
    if (this.props.legendPosition === 'bottom') {
      style.flexDirection = 'column';
    }
    return (
      <div className={className}>
        <div style={style} className="rhythm_chart__content">
          <div className="rhythm_chart__visualization">
            <TimeseriesChart
              show={ this.state.show }
              plothover={ this.plothover}
              {...this.props}/>
          </div>
          <Legend
            showLegend={this.state.showLegend}
            seriesFilter={this.state.show}
            seriesValues={this.state.values}
            onClick={this.handleHideClick}
            onToggle={this.toggleFilter}
            {...this.props}/>
        </div>
      </div>
    );
  }

});
