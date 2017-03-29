import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import reactcss from 'reactcss';
import calculateCorrdinates from '../lib/calculate_corrdinates';

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

  componentWillMount() {
    const check = () => {
      this.timeout = setTimeout(() => {
        const newState = calculateCorrdinates(this.inner, this.resize, this.state);
        if (newState && this.state && !_.isEqual(newState, this.state)) {
          this.handleResize();
        }
        check();
      }, 500);
    };
    check();
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  componentDidMount() {
    this.handleResize();
  }

  handleResize() {
    // Bingo!
    const newState = calculateCorrdinates(this.inner, this.resize, this.state);
    this.setState(newState);
  }

  render() {
    const {
      type,
      value,
      max,
      color
    } = this.props;
    const {
      scale,
      translateX,
      translateY
    } = this.state;
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
        },
        innerLine: {
          strokeWidth: this.props.innerLine
        },
        gaugeLine: {
          strokeWidth: this.props.gaugeLine
        }
      },
      half: {
        svg: {
          transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`
        }
      }
    }, { half: type === 'half' });

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
          <circle {...props.circleBackground} style={styles.innerLine}/>
          <circle {...props.circle} style={styles.gaugeLine}/>
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
      <div
        ref={(el) => this.resize = el}
        style={styles.resize}>
        <div style={styles.svg} ref={(el) => this.inner = el}>
          {svg}
        </div>
      </div>
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

