import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import { findDOMNode } from 'react-dom';
import ResizeAware from 'simianhacker-react-resize-aware';
import getLastValue from '../lib/get_last_value';
import reactcss from 'reactcss';

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

  componentDidMount() {
    const resize = findDOMNode(this.refs.resize);
    if (!resize) return;
    resize.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  componentWillUnmount() {
    const resize = findDOMNode(this.refs.resize);
    if (!resize) return;
    resize.removeEventListener('resize', this.handleResize);
  }

  calculateCorrdinates() {
    const inner = findDOMNode(this.refs.inner);
    const resize = findDOMNode(this.refs.resize);
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

  // When the component updates it might need to be resized so we need to
  // recalculate the corrdinates and only update if things changed a little. THis
  // happens when the number is too wide or you add a new series.
  componentDidUpdate() {
    const newState = this.calculateCorrdinates();
    if (!_.isEqual(newState, this.state)) {
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
    this.setState(newState);
  }

  render() {
    const { metric, secondary } = this.props;
    const { scale, translateX, translateY, top, left } = this.state;
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
      <div className="rhythm_metric" ref="container" style={styles.container}>
        <ResizeAware ref="resize" className="rhythm_metric__resize">
          <div ref="inner" className="rhythm_metric__inner" style={styles.inner}>
            <div className="rhythm_metric__primary">
              { primaryLabel }
              <div style={styles.primary_value} className="rhythm_metric__primary-value">{ primaryValue }</div>
            </div>
            { secondarySnippet }
          </div>
        </ResizeAware>
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
