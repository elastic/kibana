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
import classNames from 'classnames';
import { isBackgroundInverted, isBackgroundDark } from '../../../common/set_is_reversed';
import moment from 'moment';
import reactcss from 'reactcss';
import { FlotChart } from './flot_chart';
import { Annotation } from './annotation';
import { EuiIcon } from '@elastic/eui';

export function scaleUp(value) {
  return window.devicePixelRatio * value;
}

export function scaleDown(value) {
  return value / window.devicePixelRatio;
}

export class TimeseriesChart extends Component {
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
      return acc.concat(
        anno.series.map(series => {
          return {
            series,
            plot,
            key: `${anno.id}-${series[0]}`,
            icon: anno.icon,
            color: anno.color,
          };
        })
      );
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
      const [left, right] = this.calculateLeftRight(item, plot);
      const top = point.top;
      this.setState({
        showTooltip: true,
        item,
        left,
        right,
        top: top + 10,
        bottom: plotOffset.bottom,
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
        color={annotation.color}
      />
    );
  }

  render() {
    const { item, right, top, left } = this.state;
    const { series } = this.props;
    let tooltip;

    const styles = reactcss(
      {
        showTooltip: {
          tooltipContainer: {
            top: top - 8,
            left,
            right,
          },
        },
        hideTooltip: {
          tooltipContainer: { display: 'none' },
        },
      },
      {
        showTooltip: this.state.showTooltip,
        hideTooltip: !this.state.showTooltip,
      }
    );

    if (item) {
      const metric = series.find(r => r.id === item.series.id);
      const formatter = (metric && metric.tickFormatter) || this.props.tickFormatter || (v => v);
      const value = item.datapoint[2] ? item.datapoint[1] - item.datapoint[2] : item.datapoint[1];
      tooltip = (
        <div
          className={`tvbTooltip__container tvbTooltip__container--${right ? 'right' : 'left'}`}
          style={styles.tooltipContainer}
        >
          <span className="tvbTooltip__caret" />
          <div className="tvbTooltip">
            <div className="tvbTooltip__timestamp">
              {moment(item.datapoint[0]).format(this.props.dateFormat)}
            </div>
            <div className="tvbTooltip__item">
              <EuiIcon className="tvbTooltip__icon" type="dot" color={item.series.color} />
              <div className="tvbTooltip__label">{item.series.label}</div>
              <div className="tvbTooltip__value">{formatter(value)}</div>
            </div>
          </div>
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
      reversed: isBackgroundDark(this.props.backgroundColor),
      series: this.props.series,
      annotations: this.props.annotations,
      showGrid: this.props.showGrid,
      show: this.props.show,
      tickFormatter: this.props.tickFormatter,
      yaxes: this.props.yaxes,
      xAxisFormatter: this.props.xAxisFormatter,
    };

    const annotations = this.state.annotations.map(this.renderAnnotations);
    const axisLabelClass = classNames('tvbVisTimeSeries__axisLabel', {
      'tvbVisTimeSeries__axisLabel--reversed': isBackgroundInverted(this.props.backgroundColor),
    });

    return (
      <div ref={el => (this.container = el)} className="tvbVisTimeSeries__container">
        {tooltip}
        {annotations}
        <FlotChart {...params} />
        <div className={axisLabelClass}>{this.props.xaxisLabel}</div>
      </div>
    );
  }
}

TimeseriesChart.defaultProps = {
  showGrid: true,
  dateFormat: 'll LTS',
};

TimeseriesChart.propTypes = {
  crosshair: PropTypes.bool,
  onBrush: PropTypes.func,
  options: PropTypes.object,
  plothover: PropTypes.func,
  backgroundColor: PropTypes.string,
  series: PropTypes.array,
  annotations: PropTypes.array,
  show: PropTypes.array,
  tickFormatter: PropTypes.func,
  yaxes: PropTypes.array,
  showGrid: PropTypes.bool,
  xaxisLabel: PropTypes.string,
  dateFormat: PropTypes.string,
};
