import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import getLastValue from '../lib/get_last_value';
import reactcss from 'reactcss';
import calculateCorrdinates from '../lib/calculate_corrdinates';

class Metric extends Component {

  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      left: 0,
      top: 0,
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
    const { metric, secondary } = this.props;
    const {
      scale,
      translateX,
      translateY
    } = this.state;
    const primaryFormatter = metric && (metric.tickFormatter || metric.formatter) || (n => n);
    const primaryValue = primaryFormatter(getLastValue(metric && metric.data || 0));
    const styles = reactcss({
      default: {
        container: {},
        inner: {
          top: this.state.top || 0,
          left: this.state.left || 0,
          transform: `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`
        },
        primary_text: {
          color: 'rgba(0,0,0,0.5)'
        },
        primary_value: {
          color: '#000'
        },
        secondary_text: {
          color: 'rgba(0,0,0,0.5)'
        },
        secondary_value: {
          color: '#000'
        }
      },
      reversed: {
        primary_text: {
          color: 'rgba(255,255,255,0.7)'
        },
        primary_value: {
          color: '#FFF'
        },
        secondary_text: {
          color: 'rgba(255,255,255,0.7)'
        },
        secondary_value: {
          color: '#FFF'
        }

      }
    }, this.props);

    if (this.props.backgroundColor) styles.container.backgroundColor = this.props.backgroundColor;
    if (metric && metric.color) styles.primary_value.color = metric.color;
    let primaryLabel;
    if (metric && metric.label) {
      primaryLabel = (<div style={styles.primary_text} className="rhythm_metric__primary-label">{ metric.label }</div>);
    }

    let secondarySnippet;
    if (secondary) {
      const secondaryFormatter = secondary.formatter || (n => n);
      const secondaryValue = secondaryFormatter(getLastValue(secondary.data));
      if (secondary.color) styles.secondary_value.color = secondary.color;
      let secondaryLabel;
      if (secondary.label) {
        secondaryLabel = (<div style={styles.secondary_text} className="rhythm_metric__secondary-label">{ secondary.label }</div>);
      }
      secondarySnippet = (
        <div className="rhythm_metric__secondary">
          { secondaryLabel }
          <div style={styles.secondary_value} className="rhythm_metric__secondary-value">{ secondaryValue }</div>
        </div>
      );
    }

    return (
      <div className="rhythm_metric" style={styles.container}>
        <div
          ref={(el) => this.resize = el}
          className="rhythm_metric__resize">
          <div ref={(el) => this.inner = el} className="rhythm_metric__inner" style={styles.inner}>
            <div className="rhythm_metric__primary">
              { primaryLabel }
              <div style={styles.primary_value} className="rhythm_metric__primary-value">{ primaryValue }</div>
            </div>
            { secondarySnippet }
          </div>
        </div>
      </div>
    );
  }

}

Metric.propTypes = {
  backgroundColor: PropTypes.string,
  metric: PropTypes.object,
  secondary: PropTypes.object,
  reversed: PropTypes.bool
};

export default Metric;
