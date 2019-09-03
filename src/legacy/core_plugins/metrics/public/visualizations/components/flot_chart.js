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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import _ from 'lodash';
import $ from 'ui/flot-charts';
import { eventBus } from '../lib/events';
import { Resize } from './resize';
import { calculateBarWidth } from '../lib/calculate_bar_width';
import { calculateFillColor } from '../lib/calculate_fill_color';
import { COLORS } from '../lib/colors';

export class FlotChart extends Component {
  constructor(props) {
    super(props);
    this.handleResize = this.handleResize.bind(this);
  }

  shouldComponentUpdate(props) {
    if (!this.plot) return true;
    if (props.reversed !== this.props.reversed) {
      return true;
    }

    // if the grid changes we need to re-render
    if (props.showGrid !== this.props.showGrid) return true;

    if (props.yaxes && this.props.yaxes) {
      // We need to rerender if the axis change
      const valuesChanged = props.yaxes.some((axis, i) => {
        if (this.props.yaxes[i]) {
          return (
            axis.position !== this.props.yaxes[i].position ||
            axis.max !== this.props.yaxes[i].max ||
            axis.min !== this.props.yaxes[i].min ||
            axis.axisFormatter !== this.props.yaxes[i].axisFormatter ||
            axis.mode !== this.props.yaxes[i].mode ||
            axis.axisFormatterTemplate !== this.props.yaxes[i].axisFormatterTemplate
          );
        }
      });
      if (props.yaxes.length !== this.props.yaxes.length || valuesChanged) {
        return true;
      }
    }
    return false;
  }

  shutdownChart() {
    if (!this.plot) return;
    $(this.target).off('plothover', this.props.plothover);
    if (this.props.onMouseOver) $(this.target).off('plothover', this.handleMouseOver);
    if (this.props.onMouseLeave) $(this.target).off('mouseleave', this.handleMouseLeave);
    if (this.props.onBrush) $(this.target).off('plotselected', this.brushChart);
    this.plot.shutdown();
    if (this.props.crosshair) {
      $(this.target).off('plothover', this.handlePlotover);
      eventBus.off('thorPlotover', this.handleThorPlotover);
      eventBus.off('thorPlotleave', this.handleThorPlotleave);
    }
  }

  componentWillUnmount() {
    this.shutdownChart();
  }

  filterByShow(show) {
    if (show) {
      return metric => {
        return show.some(id => _.startsWith(id, metric.id));
      };
    }
    return () => true;
  }

  componentWillReceiveProps(newProps) {
    if (this.plot) {
      const { series } = newProps;
      const options = this.plot.getOptions();
      _.set(options, 'series.bars.barWidth', calculateBarWidth(series));
      _.set(options, 'xaxes[0].ticks', this.calculateTicks());
      this.plot.setData(this.calculateData(series, newProps.show));
      this.plot.setupGrid();
      this.plot.draw();
      if (!_.isEqual(this.props.series, newProps.series)) this.handleDraw(this.plot);
    } else {
      this.renderChart();
    }
  }

  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate() {
    this.shutdownChart();
    this.renderChart();
  }

  calculateData(data, show) {
    return _(data)
      .filter(this.filterByShow(show))
      .map(set => {
        if (_.isPlainObject(set)) {
          return {
            ...set,
            lines: this.computeColor(set.lines, set.color),
            bars: this.computeColor(set.bars, set.color),
          };
        }
        return {
          color: '#990000',
          data: set,
        };
      })
      .reverse()
      .value();
  }

  computeColor(style, color) {
    if (style && style.show) {
      const { fill, fillColor } = calculateFillColor(color, style.fill);
      return {
        ...style,
        fill,
        fillColor,
      };
    }
    return style;
  }

  handleDraw(plot) {
    if (this.props.onDraw) this.props.onDraw(plot);
  }

  getOptions(props) {
    const yaxes = props.yaxes || [{}];

    const lineColor = COLORS.lineColor;
    const textColor = props.reversed ? COLORS.textColorReversed : COLORS.textColor;

    const borderWidth = { bottom: 1, top: 0, left: 0, right: 0 };

    if (yaxes.some(y => y.position === 'left')) borderWidth.left = 1;
    if (yaxes.some(y => y.position === 'right')) borderWidth.right = 1;

    if (props.showGrid) {
      borderWidth.top = 1;
      borderWidth.left = 1;
      borderWidth.right = 1;
    }

    const opts = {
      legend: { show: false },
      yaxes: yaxes.map(axis => {
        axis.tickLength = props.showGrid ? null : 0;
        return axis;
      }),
      yaxis: {
        color: lineColor,
        font: { color: textColor, size: 11 },
        tickFormatter: props.tickFormatter,
      },
      xaxis: {
        tickLength: props.showGrid ? null : 0,
        color: lineColor,
        timezone: 'browser',
        mode: 'time',
        font: { color: textColor, size: 11 },
        ticks: this.calculateTicks(),
      },
      series: {
        shadowSize: 0,
      },
      grid: {
        margin: 0,
        borderWidth,
        borderColor: lineColor,
        hoverable: true,
        mouseActiveRadius: 200,
      },
    };

    if (props.crosshair) {
      _.set(opts, 'crosshair', {
        mode: 'x',
        color: '#C66',
        lineWidth: 1,
      });
    }

    if (props.onBrush) {
      _.set(opts, 'selection', { mode: 'x', color: textColor });
    }

    if (props.xAxisFormatter) {
      _.set(opts, 'xaxis.tickFormatter', props.xAxisFormatter);
    }

    _.set(opts, 'series.bars.barWidth', calculateBarWidth(props.series));
    return _.assign(opts, props.options);
  }

  calculateTicks() {
    const sample = this.props.xAxisFormatter(new Date());
    const tickLetterWidth = 7;
    const tickPadding = 45;
    const ticks = Math.floor(
      this.target.clientWidth / (sample.length * tickLetterWidth + tickPadding)
    );
    return ticks;
  }

  handleResize() {
    const resize = findDOMNode(this.resize);
    if (!this.rendered) {
      this.renderChart();
      return;
    }

    if (resize && resize.clientHeight > 0 && resize.clientHeight > 0) {
      if (!this.plot) return;
      const options = this.plot.getOptions();
      _.set(options, 'xaxes[0].ticks', this.calculateTicks());
      this.plot.resize();
      this.plot.setupGrid();
      this.plot.draw();
      this.handleDraw(this.plot);
    }
  }

  renderChart() {
    const resize = findDOMNode(this.resize);

    if (resize.clientWidth > 0 && resize.clientHeight > 0) {
      this.rendered = true;
      const { series } = this.props;
      const data = this.calculateData(series, this.props.show);

      this.plot = $.plot(this.target, data, this.getOptions(this.props));
      this.handleDraw(this.plot);

      _.defer(() => this.handleResize());

      this.handleMouseOver = (...args) => {
        if (this.props.onMouseOver) this.props.onMouseOver(...args, this.plot);
      };

      this.handleMouseLeave = (...args) => {
        if (this.props.onMouseLeave) this.props.onMouseLeave(...args, this.plot);
      };

      $(this.target).on('plothover', this.handleMouseOver);
      $(this.target).on('mouseleave', this.handleMouseLeave);

      if (this.props.crosshair) {
        this.handleThorPlotover = (e, pos, item, originalPlot) => {
          if (this.plot !== originalPlot) {
            this.plot.setCrosshair({ x: _.get(pos, 'x') });
            this.props.plothover(e, pos, item);
          }
        };

        this.handlePlotover = (e, pos, item) =>
          eventBus.trigger('thorPlotover', [pos, item, this.plot]);
        this.handlePlotleave = () => eventBus.trigger('thorPlotleave');
        this.handleThorPlotleave = e => {
          if (this.plot) this.plot.clearCrosshair();
          if (this.props.plothover) this.props.plothover(e);
        };

        $(this.target).on('plothover', this.handlePlotover);
        $(this.target).on('mouseleave', this.handlePlotleave);
        eventBus.on('thorPlotover', this.handleThorPlotover);
        eventBus.on('thorPlotleave', this.handleThorPlotleave);
      }

      if (_.isFunction(this.props.plothover)) {
        $(this.target).bind('plothover', this.props.plothover);
      }

      $(this.target).on('mouseleave', () => {
        eventBus.trigger('thorPlotleave');
      });

      if (_.isFunction(this.props.onBrush)) {
        this.brushChart = (e, ranges) => {
          this.props.onBrush(ranges);
          this.plot.clearSelection();
        };

        $(this.target).on('plotselected', this.brushChart);
      }
    }
  }

  render() {
    return (
      <Resize
        onResize={this.handleResize}
        ref={el => (this.resize = el)}
        className="tvbVisTimeSeries__container"
      >
        <div ref={el => (this.target = el)} className="tvbVisTimeSeries__container" />
      </Resize>
    );
  }
}

FlotChart.defaultProps = {
  showGrid: true,
};

FlotChart.propTypes = {
  crosshair: PropTypes.bool,
  onBrush: PropTypes.func,
  onPlotCreate: PropTypes.func,
  onMouseOver: PropTypes.func,
  onMouseLeave: PropTypes.func,
  options: PropTypes.object,
  plothover: PropTypes.func,
  reversed: PropTypes.bool,
  series: PropTypes.array,
  show: PropTypes.array,
  tickFormatter: PropTypes.func,
  showGrid: PropTypes.bool,
  yaxes: PropTypes.array,
};
