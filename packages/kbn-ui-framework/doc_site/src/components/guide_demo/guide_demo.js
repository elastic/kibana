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

export class GuideDemo extends Component {
  componentDidMount() {
    this.update();
  }

  componentDidUpdate() {
    this.update();
  }

  update() {
    // We'll just render the children if we have them.
    if (this.props.children) {
      return;
    }

    // Inject HTML.
    this.content.innerHTML = this.props.html; // eslint-disable-line no-unsanitized/property

    // Inject JS.
    const js = document.createElement('script');
    js.type = 'text/javascript';
    js.innerHTML = this.props.js; // eslint-disable-line no-unsanitized/property
    this.content.appendChild(js);

    // Inject CSS.
    const css = document.createElement('style');
    css.innerHTML = this.props.css; // eslint-disable-line no-unsanitized/property
    this.content.appendChild(css);
  }

  render() {
    const {
      isFullScreen,
      children,
      className,
      js, // eslint-disable-line no-unused-vars
      html, // eslint-disable-line no-unused-vars
      css, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    const classes = classNames('guideDemo', className, {
      'guideDemo--fullScreen': isFullScreen,
    });

    return (
      <div className={classes} ref={(c) => (this.content = c)} {...rest}>
        {children}
      </div>
    );
  }
}

GuideDemo.propTypes = {
  children: PropTypes.node,
  js: PropTypes.string.isRequired,
  html: PropTypes.string.isRequired,
  css: PropTypes.string.isRequired,
  isFullScreen: PropTypes.bool.isRequired,
};

GuideDemo.defaultProps = {
  js: '',
  html: '',
  css: '',
  isFullScreen: false,
};
