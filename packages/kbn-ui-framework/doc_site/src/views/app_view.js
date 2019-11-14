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

import {
  Routes,
} from '../services';

import {
  GuideCodeViewer,
  GuideNav,
} from '../components';

// Inject version into header.
const pkg = require('../../../../../package.json');

export class AppView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isNavOpen: false,
      isChromeVisible: !props.isSandbox,
    };

    this.onClickNavItem = this.onClickNavItem.bind(this);
    this.onToggleNav = this.onToggleNav.bind(this);
    this.onCloseCodeViewer = this.onCloseCodeViewer.bind(this);
    this.onHideChrome = this.onHideChrome.bind(this);
    this.onShowChrome = this.onShowChrome.bind(this);
  }

  onClickNavItem() {
    this.setState({
      isNavOpen: false,
    });
  }

  onCloseCodeViewer() {
    this.props.closeCodeViewer();
  }

  onToggleNav() {
    this.setState({
      isNavOpen: !this.state.isNavOpen,
    });
  }

  onHideChrome() {
    this.setState({
      isChromeVisible: false,
      isNavOpen: false,
    });

    this.props.closeCodeViewer();
  }

  onShowChrome() {
    this.setState({
      isChromeVisible: true,
    });
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    // Only force the chrome to be hidden if we're navigating from a non-sandbox to a sandbox.
    if (!this.props.isSandbox && nextProps.isSandbox) {
      this.setState({
        isChromeVisible: false,
      });
    }
  }

  render() {
    const contentClasses = classNames('guideContent', {
      'is-code-viewer-open': this.props.isCodeViewerOpen,
      'is-chrome-hidden': !this.state.isChromeVisible,
    });

    return (
      <div className="guide">
        <GuideNav
          isChromeVisible={this.state.isChromeVisible}
          isNavOpen={this.state.isNavOpen}
          isSandbox={this.props.isSandbox}
          onHideChrome={this.onHideChrome}
          onShowChrome={this.onShowChrome}
          onToggleNav={this.onToggleNav}
          onClickNavItem={this.onClickNavItem}
          version={pkg.version}
          routes={this.props.routes}
          getNextRoute={Routes.getNextRoute}
          getPreviousRoute={Routes.getPreviousRoute}
          components={Routes.components}
          sandboxes={Routes.sandboxes}
        />

        <div className={contentClasses}>
          {this.props.children}
        </div>

        <GuideCodeViewer
          isOpen={this.props.isCodeViewerOpen}
          onClose={this.onCloseCodeViewer}
          title={this.props.title}
          source={this.props.source}
        />
      </div>
    );
  }
}

AppView.propTypes = {
  children: PropTypes.any,
  routes: PropTypes.array.isRequired,
  isSandbox: PropTypes.bool,
  openCodeViewer: PropTypes.func,
  closeCodeViewer: PropTypes.func,
  isCodeViewerOpen: PropTypes.bool,
  registerSection: PropTypes.func,
  unregisterSection: PropTypes.func,
  sections: PropTypes.array,
  source: PropTypes.array,
  title: PropTypes.string,
};

AppView.defaultProps = {
  source: [],
};
