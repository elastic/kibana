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

import Slugify from '../../services/string/slugify';

export class GuideSection extends Component {
  constructor(props) {
    super(props);
    this.onClickSource = this.onClickSource.bind(this);
  }

  getId() {
    return Slugify.one(this.props.title);
  }

  onClickSource() {
    this.props.openCodeViewer(this.props.source, this.props.title);
  }

  UNSAFE_componentWillMount() {
    this.props.registerSection(this.getId(), this.props.title);
  }

  componentWillUnmount() {
    this.props.unregisterSection(this.getId());
  }

  render() {
    return (
      <div
        id={this.getId()}
        className="guideSection"
      >
        <div className="guideSection__header">
          <div className="guideSection__title">
            {this.props.title}
          </div>
          <button
            className="guideSection__sourceButton"
            onClick={this.onClickSource}
          >
            <span className="fa fa-code" />
          </button>
        </div>

        {this.props.children}
      </div>
    );
  }
}

GuideSection.propTypes = {
  title: PropTypes.string,
  source: PropTypes.array,
  children: PropTypes.any,
  openCodeViewer: PropTypes.func,
  registerSection: PropTypes.func,
  unregisterSection: PropTypes.func,
};
