import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import getLastValue from '../lib/get_last_value';
import TimeseriesChart from './timeseries_chart';
import Legend from './legend';
import eventBus from '../lib/events';
import reactcss from 'reactcss';

class Timeseries extends Component {

  constructor(props) {
    super(props);
    const values = this.getLastValues(props);
    this.state = {
      showLegend: props.legend != null ? props.legend : true,
      values: values || {},
      show: _.keys(values) || [],
      ignoreLegendUpdates: false,
      ignoreVisabilityUpdates: false
    };
    this.toggleFilter = this.toggleFilter.bind(this);
    this.handleHideClick = this.handleHideClick.bind(this);
    this.plothover = this.plothover.bind(this);
  }

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
  }

  toggleFilter(event, id) {
    const show = this.filterLegend(id);
    if (_.isFunction(this.props.onFilter)) {
      this.props.onFilter(show);
    }
    eventBus.trigger('toggleFilter', id, this);
  }

  getLastValues(props) {
    const values = {};
    props.series.forEach((row) => {
      // we need a valid identifier
      if (!row.id) row.id = row.label;
      values[row.id] = getLastValue(row.data);
    });
    return values;
  }

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
            const [ , value ] = row.data[closest];
            values[row.id] = value != null && value || null;
          }
        }
      });
    } else {
      _.assign(values, this.getLastValues(this.props));
    }

    this.setState({ values });
  }

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
  }

  plothover(event, pos, item) {
    this.updateLegend(pos, item);
  }

  handleHideClick() {
    this.setState({ showLegend: !this.state.showLegend });
  }

  render() {
    let className = 'rhythm_chart';
    if (this.props.reversed) {
      className += ' reversed';
    }
    const styles = reactcss({
      bottomLegend: {
        content: {
          flexDirection: 'column'
        }
      }
    }, { bottomLegend: this.props.legendPosition === 'bottom' });
    return (
      <div className={className}>
        <div style={styles.content} className="rhythm_chart__content">
          <div className="rhythm_chart__visualization">
            <TimeseriesChart
              crosshair={this.props.crosshair}
              onBrush={this.props.onBrush}
              plothover={ this.plothover}
              reversed={this.props.reversed}
              series={this.props.series}
              annotations={this.props.annotations}
              show={ this.state.show }
              tickFormatter={this.props.tickFormatter}
              options={this.props.options}
              xaxisLabel={this.props.xaxisLabel}
              yaxes={this.props.yaxes} />
          </div>
          <Legend
            legendPosition={this.props.legendPosition}
            onClick={this.handleHideClick}
            onToggle={this.toggleFilter}
            series={this.props.series}
            showLegend={this.state.showLegend}
            seriesValues={this.state.values}
            seriesFilter={this.state.show}
            tickFormatter={this.props.tickFormatter} />
        </div>
      </div>
    );
  }



}

Timeseries.defaultProps = {
  legned: true
};

Timeseries.propTypes = {
  legend: PropTypes.bool,
  legendPosition: PropTypes.string,
  onFilter: PropTypes.func,
  series: PropTypes.array,
  annotations: PropTypes.array,
  reversed: PropTypes.bool,
  options: PropTypes.object,
  tickFormatter: PropTypes.func,
  xaxisLabel: PropTypes.string
};

export default Timeseries;
