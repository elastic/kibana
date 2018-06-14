/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';
import reactcss from 'reactcss';
import FlotChart from './flot_chart';
import Annotation from './annotation';

export function scaleUp(value) {
  return window.devicePixelRatio * value;
}

export function scaleDown(value) {
  return value / window.devicePixelRatio;
}

class TimeseriesChart extends Component {

  constructor(props) {
    super(props);
    this.state = {
      annotations: [],
      showTooltip: false,
      mouseHoverTimer: false,
    };
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.renderAnnotations = this.renderAnnotations.bind(this);
    this.handleDraw = this.handleDraw.bind(this);
  }

  calculateLeftRight(item, plot) {
    const canvas = plot.getCanvas();
    const point = plot.pointOffset({ x: item.datapoint[0], y: item.datapoint[1] });
    const edge = (scaleUp(point.left) + 10) / canvas.width;
    let right;
    let left;
    if (edge > 0.5) {
      right = scaleDown(canvas.width) - point.left;
      left = null;
    } else {
      right = null;
      left = point.left;
    }
    return [left, right];
  }

  handleDraw(plot) {
    if (!plot || !this.props.annotations) return;
    const annotations = this.props.annotations.reduce((acc, anno) => {
      return acc.concat(anno.series.map(series => {
        return {
          series,
          plot,
          key: `${anno.id}-${series[0]}`,
          icon: anno.icon,
          color: anno.color
        };
      }));
    }, []);
    this.setState({ annotations });
  }

  handleMouseOver(e, pos, item, plot) {

    if (typeof this.state.mouseHoverTimer === 'number') {
      window.clearTimeout(this.state.mouseHoverTimer);
    }

    if (item) {
      const plotOffset = plot.getPlotOffset();
      const point = plot.pointOffset({ x: item.datapoint[0], y: item.datapoint[1] });
      const [left, right ] = this.calculateLeftRight(item, plot);
      const top = point.top;
      this.setState({
        showTooltip: true,
        item,
        left,
        right,
        top: top + 10,
        bottom: plotOffset.bottom
      });
    }
  }

  handleMouseLeave() {
    this.state.mouseHoverTimer = window.setTimeout(() => {
      this.setState({ showTooltip: false });
    }, 250);
  }

  renderAnnotations(annotation) {
    return (
      <Annotation
        series={annotation.series}
        plot={annotation.plot}
        key={annotation.key}
        icon={annotation.icon}
        reversed={this.props.reversed}
        color={annotation.color}
      />
    );
  }

  render() {
    const { item, right, top, left } = this.state;
    const { series } = this.props;
    let tooltip;

    const styles = reactcss({
      showTooltip: {
        tooltipContainer: {
          pointerEvents: 'none',
          position: 'absolute',
          top: top - 28,
          left,
          right,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 5px'
        },
        tooltip: {
          backgroundColor: this.props.reversed ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          color: this.props.reversed ? 'black' : 'white',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px'
        },
        rightCaret: {
          display: right ? 'block' : 'none',
          color: this.props.reversed ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
        },
        leftCaret: {
          display: left ? 'block' : 'none',
          color: this.props.reversed ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
        },
        date: {
          color: this.props.reversed ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
          fontSize: '12px',
          lineHeight: '12px'
        },
        items: {
          display: 'flex',
          alignItems: 'center'
        },
        text: {
          whiteSpace: 'nowrap',
          fontSize: '12px',
          lineHeight: '12px',
          marginRight: 5
        },
        icon: {
          marginRight: 5
        },
        value: {
          fontSize: '12px',
          flexShrink: 0,
          lineHeight: '12px',
          marginLeft: 5
        }
      },
      hideTooltip: {
        tooltipContainer: { display: 'none' },
      }
    }, {
      showTooltip: this.state.showTooltip,
      hideTooltip: !this.state.showTooltip,
    });

    if (item) {
      const metric = series.find(r => r.id === item.series.id);
      const formatter = metric && metric.tickFormatter || this.props.tickFormatter || ((v) => v);
      const value = item.datapoint[2] ? item.datapoint[1] - item.datapoint[2] : item.datapoint[1];
      tooltip = (
        <div style={styles.tooltipContainer}>
          <i className="fa fa-caret-left" style={styles.leftCaret} />
          <div style={styles.tooltip}>
            <div style={styles.items}>
              <div style={styles.icon}>
                <i className="fa fa-circle" style={{ color: item.series.color }} />
              </div>
              <div style={styles.text}>{ item.series.label }</div>
              <div style={styles.value}>{ formatter(value) }</div>
            </div>
            <div style={styles.date}>{ moment(item.datapoint[0]).format(this.props.dateFormat) }</div>
          </div>
          <i className="fa fa-caret-right" style={styles.rightCaret} />
        </div>
      );
    }

    const params = {
      crosshair: this.props.crosshair,
      onPlotCreate: this.handlePlotCreate,
      onBrush: this.props.onBrush,
      onMouseLeave: this.handleMouseLeave,
      onMouseOver: this.handleMouseOver,
      onDraw: this.handleDraw,
      options: this.props.options,
      plothover: this.props.plothover,
      reversed: this.props.reversed,
      series: this.props.series,
      annotations: this.props.annotations,
      showGrid: this.props.showGrid,
      show: this.props.show,
      tickFormatter: this.props.tickFormatter,
      yaxes: this.props.yaxes,
      xAxisFormatter: this.props.xAxisFormatter
    };

    const annotations = this.state.annotations.map(this.renderAnnotations);
    let axisLabelClass = 'rhythm_chart__axis-label';
    if (this.props.reversed) {
      axisLabelClass += ' reversed';
    }

    return (
      <div ref={(el) => this.container = el} className="rhythm_chart__timeseries-container">
        { tooltip }
        { annotations }
        <FlotChart {...params}/>
        <div className={axisLabelClass}>{this.props.xaxisLabel}</div>
      </div>
    );
  }


}

TimeseriesChart.defaultProps = {
  showGrid: true,
  dateFormat: 'll LTS'
};

TimeseriesChart.propTypes = {
  crosshair: PropTypes.bool,
  onBrush: PropTypes.func,
  options: PropTypes.object,
  plothover: PropTypes.func,
  reversed: PropTypes.bool,
  series: PropTypes.array,
  annotations: PropTypes.array,
  show: PropTypes.array,
  tickFormatter: PropTypes.func,
  yaxes: PropTypes.array,
  showGrid: PropTypes.bool,
  xaxisLabel: PropTypes.string,
  dateFormat: PropTypes.string
};

export default TimeseriesChart;
