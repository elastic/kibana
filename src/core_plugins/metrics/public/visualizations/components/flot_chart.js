import React, { Component, PropTypes } from 'react';
import { findDOMNode } from 'react-dom';
import _ from 'lodash';
import $ from '../lib/flot';
import eventBus from '../lib/events';
import ResizeAware from 'simianhacker-react-resize-aware';
import calculateBarWidth from '../lib/calculate_bar_width';
import colors from '../lib/colors';

class FlotChart extends Component {

  shouldComponentUpdate(props, state) {
    if (!this.plot) return true;
    if (props.reversed !== this.props.reversed) {
      return true;
    }
    if (props.yaxes && this.props.yaxes) {
      // We need to rerender if the axis change
      const valuesChanged = props.yaxes.some((axis, i) => {
        return this.props.yaxes[i] && axis.tickFormatter !== this.props.yaxes[i].tickFormatter &&
          axis.position !== this.props.yaxes[i].position;
      });
      if (props.yaxes.length !== this.props.yaxes.length || valuesChanged) {
        return true;
      }
    }
    return false;
  }

  shutdownChart() {
    if (!this.plot) return;
    const { target } = this.refs;
    $(target).unbind('plothover', this.props.plothover);
    if (this.props.onMouseOver) $(target).on('plothover', this.handleMouseOver);
    if (this.props.onMouseLeave) $(target).on('mouseleave', this.handleMouseLeave);
    if (this.props.onBrush) $(target).off('plotselected', this.brushChart);
    this.plot.shutdown();
    if (this.props.crosshair) {
      $(target).off('plothover', this.handlePlotover);
      eventBus.off('thorPlotover', this.handleThorPlotover);
      eventBus.off('thorPlotleave', this.handleThorPlotleave);
    }
    findDOMNode(this.refs.resize).removeEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    this.shutdownChart();
  }

  filterByShow(show) {
    if (show) {
      return (metric) => {
        return show.some(id => _.startsWith(id, metric.id));
      };
    }
    return (metric) => true;
  }

  componentWillReceiveProps(newProps) {
    if (this.plot) {
      const { series, markings } = newProps;
      const options = this.plot.getOptions();
      _.set(options, 'series.bars.barWidth', calculateBarWidth(series));
      this.plot.setData(this.calculateData(series, newProps.show));
      this.plot.setupGrid();
      this.plot.draw();
      if (!_.isEqual(this.props.series, series)) this.handleDraw(this.plot);
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
    const series = [];
    return _(data)
      .filter(this.filterByShow(show))
      .map((set) => {
        if (_.isPlainObject(set)) {
          return set;
        }
        return {
          color: '#990000',
          data: set
        };
      }).reverse().value();
  }

  handleDraw(plot, canvasContext) {
    if (this.props.onDraw) this.props.onDraw(plot);
  }

  getOptions() {
    const yaxes = this.props.yaxes || [{}];

    const lineColor = this.props.reversed ? colors.lineColorReversed : colors.lineColor;
    const textColor = this.props.reversed ? colors.textColorReversed : colors.textColor;
    const valueColor = this.props.reversed ? colors.valueColorReversed : colors.valueColor;

    const opts = {
      legend: { show: false },
      yaxes: yaxes,
      yaxis: {
        color: lineColor,
        font: { color: textColor },
        tickFormatter: this.props.tickFormatter
      },
      xaxis: {
        color: lineColor,
        timezone: 'browser',
        mode: 'time',
        font: { color: textColor }
      },
      series: {
        shadowSize: 0
      },
      grid: {
        margin: 0,
        borderWidth: 1,
        borderColor: lineColor,
        hoverable: true,
        mouseActiveRadius: 200,
      }
    };

    if (this.props.crosshair) {
      _.set(opts, 'crosshair', {
        mode: 'x',
        color: this.props.reversed ? '#FFF' : '#000',
        lineWidth: 1
      });
    }

    if (this.props.onBrush) {
      _.set(opts, 'selection', { mode: 'x', color: textColor });
    }
    _.set(opts, 'series.bars.barWidth', calculateBarWidth(this.props.series));
    return _.assign(opts, this.props.options);
  }

  renderChart() {
    const resize = findDOMNode(this.refs.resize);

    if (resize.clientWidth > 0 && resize.clientHeight > 0) {
      const { target } = this.refs;
      const { series } = this.props;
      const parent = $(target.parentElement);
      const data = this.calculateData(series, this.props.show);

      this.plot = $.plot(target, data, this.getOptions());
      this.handleDraw(this.plot);

      this.handleResize = (e) => {
        const resize = findDOMNode(this.refs.resize);
        if (resize.clientHeight > 0 && resize.clientHeight > 0) {
          if (!this.plot) return;
          this.plot.resize();
          this.plot.setupGrid();
          this.plot.draw();
          this.handleDraw(this.plot);
        }
      };

      _.defer(() => this.handleResize());
      findDOMNode(this.refs.resize).addEventListener('resize', this.handleResize);


      this.handleMouseOver = (...args) => {
        if (this.props.onMouseOver) this.props.onMouseOver(...args, this.plot);
      };

      this.handleMouseLeave = (...args) => {
        if (this.props.onMouseLeave) this.props.onMouseLeave(...args, this.plot);
      };

      $(target).on('plothover', this.handleMouseOver);
      $(target).on('mouseleave', this.handleMouseLeave);

      if (this.props.crosshair) {


        this.handleThorPlotover = (e, pos, item, originalPlot) => {
          if (this.plot !== originalPlot) {
            this.plot.setCrosshair({ x: _.get(pos, 'x') });
            this.props.plothover(e, pos, item);
          }
        };

        this.handlePlotover = (e, pos, item) => eventBus.trigger('thorPlotover', [pos, item, this.plot]);
        this.handlePlotleave = (e) => eventBus.trigger('thorPlotleave');
        this.handleThorPlotleave = (e) =>  {
          this.plot.clearCrosshair();
          if (this.props.plothover) this.props.plothover(e);
        };

        $(target).on('plothover', this.handlePlotover);
        $(target).on('mouseleave', this.handlePlotleave);
        eventBus.on('thorPlotover', this.handleThorPlotover);
        eventBus.on('thorPlotleave', this.handleThorPlotleave);
      }

      if (_.isFunction(this.props.plothover)) {
        $(target).bind('plothover', this.props.plothover);
      }

      $(target).on('mouseleave', (e) => {
        eventBus.trigger('thorPlotleave');
      });

      if (_.isFunction(this.props.onBrush)) {
        this.brushChart = (e, ranges) => {
          this.props.onBrush(ranges);
          this.plot.clearSelection();
        };

        $(target).on('plotselected', this.brushChart);
      }
    }
  }

  render() {
    const style = {
      position: 'relative',
      display: 'flex',
      rowDirection: 'column',
      flex: '1 0 auto',
    };
    return (
      <ResizeAware ref="resize" style={style}>
        <div ref="target" style={style}/>
      </ResizeAware>);
  }

}

FlotChart.propTypes = {
  crosshair     : PropTypes.bool,
  onBrush       : PropTypes.func,
  onPlotCreate  : PropTypes.func,
  onMouseOver   : PropTypes.func,
  onMouseLeave  : PropTypes.func,
  options       : PropTypes.object,
  plothover     : PropTypes.func,
  reversed      : PropTypes.bool,
  series        : PropTypes.array,
  show          : PropTypes.array,
  tickFormatter : PropTypes.func,
  yaxes         : PropTypes.array,
};

export default FlotChart;

