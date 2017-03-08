import React, { Component, PropTypes } from 'react';
import $ from '../lib/flot';
import Resize from './resize';
import _ from 'lodash';
import { findDOMNode } from 'react-dom';
import reactcss from 'reactcss';

class GaugeVis extends Component {

  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      top: 0,
      left: 0,
      translateX: 1,
      translateY: 1
    };
    this.handleResize = this.handleResize.bind(this);
  }

  calculateCorrdinates() {
    const inner = findDOMNode(this.inner);
    const resize = findDOMNode(this.resize);
    let scale = this.state.scale;

    // Let's start by scaling to the largest dimension
    if (resize.clientWidth - resize.clientHeight < 0) {
      scale = resize.clientWidth / inner.clientWidth;
    } else {
      scale = resize.clientHeight / inner.clientHeight;
    }
    let [ newWidth, newHeight ] = this.calcDimensions(inner, scale);

    // Now we need to check to see if it will still fit
    if (newWidth > resize.clientWidth) {
      scale = resize.clientWidth / inner.clientWidth;
    }
    if (newHeight > resize.clientHeight) {
      scale = resize.clientHeight / inner.clientHeight;
    }

    // Calculate the final dimensions
    [ newWidth, newHeight ] = this.calcDimensions(inner, scale);

    // Because scale is middle out we need to translate
    // the new X,Y corrdinates
    const translateX = (newWidth - inner.clientWidth) / 2;
    const translateY = (newHeight - inner.clientHeight) / 2;

    // Center up and down
    const top = Math.floor((resize.clientHeight - newHeight) / 2);
    const left = Math.floor((resize.clientWidth - newWidth) / 2);

    return { scale, top, left, translateY, translateX };
  }

  componentDidMount() {
    this.handleResize();
  }

  // When the component updates it might need to be resized so we need to
  // recalculate the corrdinates and only update if things changed a little. THis
  // happens when the number is too wide or you add a new series.
  componentDidUpdate() {
    const newState = this.calculateCorrdinates();
    if (newState && !_.isEqual(newState, this.state)) {
      this.setState(newState);
    }
  }

  calcDimensions(el, scale) {
    const newWidth = Math.floor(el.clientWidth * scale);
    const newHeight = Math.floor(el.clientHeight * scale);
    return [newWidth, newHeight];
  }

  handleResize() {
    // Bingo!
    const newState = this.calculateCorrdinates();
    newState && this.setState(newState);
  }

  render() {
    const { type, value, max, color, reversed } = this.props;
    const { scale, translateX, translateY, top, left } = this.state;
    const size = 2 * Math.PI * 50;
    const sliceSize = type === 'half' ? 0.6 : 1;
    const percent = value < max ? value / max : 1;
    const styles = reactcss({
      default: {
        resize: {
          position: 'relative',
          display: 'flex',
          rowDirection: 'column',
          flex: '1 0 auto'
        },
        svg: {
          position: 'absolute',
          top: this.state.top,
          left: this.state.left,
          transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`
        }
      }
    }, this.props);

    const props = {
      circle: {
        r: 50,
        cx: 60,
        cy: 60,
        fill: 'rgba(0,0,0,0)',
        stroke: color,
        strokeWidth: this.props.gaugeLine,
        strokeDasharray: `${(percent * sliceSize) * size} ${size}`,
        transform: 'rotate(-90 60 60)',
      },
      circleBackground: {
        r: 50,
        cx: 60,
        cy: 60,
        fill: 'rgba(0,0,0,0)',
        stroke: this.props.reversed ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
        strokeDasharray: `${sliceSize * size} ${size}`,
        strokeWidth: this.props.innerLine
      }
    };

    if (type === 'half') {
      styles.svg.transform = `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`;
      props.circle.transform = 'rotate(-197.8 60 60)';
      props.circleBackground.transform = 'rotate(162 60 60)';
    }

    if (this.props.innerColor) {
      props.circleBackground.stroke = this.props.innerColor;
    }

    let svg;
    if (type === 'half') {
      svg = (
        <svg width={120.72} height={78.72}>
          <circle {...props.circleBackground} style={{ strokeWidth: this.props.innerLine }}/>
          <circle {...props.circle} style={{ strokeWidth: this.props.gaugeLine }}/>
        </svg>
      );
    } else {
      svg = (
        <svg width={120.72} height={120.72}>
          <circle {...props.circleBackground}/>
          <circle {...props.circle}/>
        </svg>
      );
    }
    return (
      <Resize
        onResize={this.handleResize}
        ref={(el) => this.resize = el}
        style={styles.resize}>
        <div style={styles.svg} ref={(el) => this.inner = el}>
          {svg}
        </div>
      </Resize>
    );
  }

}

GaugeVis.defaultProps = {
  innerLine: 2,
  gaugeLine: 10
};

GaugeVis.propTypes = {
  color: PropTypes.string,
  gaugeLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerColor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  innerLine: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  metric: PropTypes.object,
  reversed: PropTypes.bool,
  value: PropTypes.number,
  type: PropTypes.oneOf(['half', 'circle'])
};

export default GaugeVis;

