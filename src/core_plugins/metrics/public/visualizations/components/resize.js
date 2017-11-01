/*
 * Please note: Much of this code is taken from the MIT licensed react-resize-detector module written by @maslianok
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

const parentStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  zIndex: -1,
  visibility: 'hidden'
};

const shrinkChildStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '200%',
  height: '200%'
};

const expandChildStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%'
};

class Resize extends Component {
  constructor() {
    super();

    this.state = {
      expandChildHeight: 0,
      expandChildWidth: 0,
      expandScrollLeft: 0,
      expandScrollTop: 0,
      shrinkScrollTop: 0,
      shrinkScrollLeft: 0,
      lastWidth: 0,
      lastHeight: 0
    };

    this.reset = this.reset.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  componentWillMount() {
    this.forceUpdate();
  }

  componentDidMount() {
    const [width, height] = this.containerSize();
    this.reset(width, height);
    this.props.onResize(width, height);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.props !== nextProps || this.state !== nextState;
  }

  componentDidUpdate() {
    this.expand.scrollLeft = this.expand.scrollWidth;
    this.expand.scrollTop = this.expand.scrollHeight;

    this.shrink.scrollLeft = this.shrink.scrollWidth;
    this.shrink.scrollTop = this.shrink.scrollHeight;
  }

  containerSize() {
    return [
      this.props.handleWidth && this.container.parentElement.offsetWidth,
      this.props.handleHeight && this.container.parentElement.offsetHeight
    ];
  }

  reset(containerWidth, containerHeight) {
    if (typeof window === 'undefined') {
      return;
    }

    const parent = this.container.parentElement;

    let position = 'static';
    if (parent.currentStyle) {
      position = parent.currentStyle.position;
    } else if (window.getComputedStyle) {
      position = window.getComputedStyle(parent).position;
    }
    if (position === 'static') {
      parent.style.position = 'relative';
    }

    this.setState({
      expandChildHeight: this.expand.offsetHeight + 10,
      expandChildWidth: this.expand.offsetWidth + 10,
      lastWidth: containerWidth,
      lastHeight: containerHeight
    });
  }

  handleScroll(e) {
    if (typeof window === 'undefined') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const { state } = this;

    const [width, height] = this.containerSize();
    if (width !== state.lastWidth || height !== state.lastHeight) {
      this.props.onResize(width, height);
    }

    this.reset(width, height);
  }

  render() {
    const { state } = this;

    const expandStyle = {
      ...expandChildStyle,
      width: state.expandChildWidth,
      height: state.expandChildHeight
    };

    return (
      <div
        style={parentStyle}
        ref={e => {
          this.container = e;
        }}
      >
        <div
          style={parentStyle}
          onScroll={this.handleScroll}
          ref={e => {
            this.expand = e;
          }}
        >
          <div style={expandStyle} />
        </div>
        <div
          style={parentStyle}
          onScroll={this.handleScroll}
          ref={e => {
            this.shrink = e;
          }}
        >
          <div style={shrinkChildStyle} />
        </div>
      </div>
    );
  }
}

Resize.propTypes = {
  handleWidth: PropTypes.bool,
  handleHeight: PropTypes.bool,
  onResize: PropTypes.func
};

Resize.defaultProps = {
  handleWidth: true,
  handleHeight: true,
  onResize: e => e
};

export default Resize;
