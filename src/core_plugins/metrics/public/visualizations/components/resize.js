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
import { findDOMNode } from 'react-dom';
class Resize extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.handleResize = this.handleResize.bind(this);
  }

  checkSize() {
    const el = findDOMNode(this.el);
    if (!el) return;
    this.timeout = setTimeout(() => {
      const { currentHeight, currentWidth } = this.state;
      if (currentHeight !== el.parentNode.clientHeight || currentWidth !== el.parentNode.clientWidth) {
        this.setState({
          currentWidth: el.parentNode.clientWidth,
          currentHeight: el.parentNode.clientHeight
        });
        this.handleResize();
      }
      clearTimeout(this.timeout);
      this.checkSize();
    }, this.props.frequency);
  }

  componentDidMount() {
    this.checkSize();
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handleResize() {
    if (this.props.onResize) this.props.onResize();
  }

  render() {
    const style = this.props.style || {};
    const className = this.props.className || '';
    return(
      <div
        style={style}
        className={className}
        ref={(el) => this.el = el}
      >
        {this.props.children}
      </div>
    );
  }

}

Resize.defaultProps = {
  frequency: 500
};

Resize.propTypes = {
  frequency: PropTypes.number,
  onResize: PropTypes.func
};

export default Resize;
