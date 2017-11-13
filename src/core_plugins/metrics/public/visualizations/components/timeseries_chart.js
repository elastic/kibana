import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';
import reactcss from 'reactcss';
import { findIndex } from 'lodash';
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
      const offset = plot.offset();
      const width = plot.width();
      const height = plot.height();
      const plotOffset = plot.getPlotOffset();
      const mouseX = Math.max(0, Math.min(pos.pageX - offset.left, width));
      const mouseY = Math.max(0, Math.min(pos.pageY - offset.top, height));
      const [left, right ] = this.calculateLeftRight(item, plot);
      this.setState({
        showTooltip: true,
        item,
        left,
        right,
        mouseX,
        mouseY,
        width,
        leftOffset: plotOffset.left,
        rightOffset: plotOffset.right
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
    const { item, right, left, mouseX, mouseY, width, leftOffset, rightOffset } = this.state;
    const { series } = this.props;
    let tooltip;
    let timestamp;
    let dataPoints = [];

    if (item) {
      timestamp = item.datapoint[0];
      dataPoints = series.reduce((points, series) => {
        const index = findIndex(series.data, (d => d[0] === timestamp));
        if (index > -1) {
          const datapoint = series.data[index];
          if (datapoint) {
            const point = {
              series,
              datapoint,
            };
            points = [...points, point];
          }
        }
        return points;
      }, []);
    }

    const styles = reactcss({
      showTooltip: {
        tooltipContainer: {
          pointerEvents: 'none',
          position: 'absolute',
          top: mouseY - (dataPoints.length * 17 + 10) / 2,
          left: left ? mouseX + leftOffset : null,
          right: right ? width - mouseX + rightOffset : null,
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
          lineHeight: '12px',
          marginTop: 2
        },
        items: {
          display: 'flex',
          alignItems: 'center',
          height: '17px'
        },
        text: {
          whiteSpace: 'nowrap',
          fontSize: '12px',
          lineHeight: '12px',
          marginRight: 5,
          maxWidth: '300px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        },
        icon: {
          marginRight: 5
        },
        value: {
          fontSize: '12px',
          flexShrink: 0,
          lineHeight: '12px',
          marginLeft: 'auto'
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
      const rows = dataPoints.map(point => {
        const metric = series.find(r => r.id === point.series.id);
        const formatter = metric && metric.tickFormatter || this.props.tickFormatter || ((v) => v);
        const value = point.datapoint[2] ? point.datapoint[1] - point.datapoint[2] : point.datapoint[1];

        return (
          <div key={point.series.id} style={styles.items}>
            <div style={styles.icon}>
              <i className="fa fa-circle" style={{ color: point.series.color }}/>
            </div>
            <div style={styles.text}>{point.series.label}</div>
            <div style={styles.value}>{formatter(value)}</div>
          </div>
        );
      }, this);

      tooltip = (
        <div style={styles.tooltipContainer}>
          <i className="fa fa-caret-left" style={styles.leftCaret} />
          <div style={styles.tooltip}>
            {rows}
            <div style={styles.date}>{ moment(timestamp).format(this.props.dateFormat) }</div>
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
      yaxes: this.props.yaxes
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
