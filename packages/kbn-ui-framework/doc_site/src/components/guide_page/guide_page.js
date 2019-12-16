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

import { GuidePageSideNav, GuidePageSideNavItem } from '../';

export class GuidePage extends Component {
  constructor(props) {
    super(props);

    this.onClickLink = this.onClickLink.bind(this);
  }

  onClickLink(id) {
    // Scroll to element.
    // eslint-disable-next-line no-undef
    $('html, body').animate(
      {
        // eslint-disable-next-line no-undef
        scrollTop: $(`#${id}`).offset().top - 100,
      },
      250
    );
  }

  renderSideNavMenu() {
    // Traverse sections and build side nav from it.
    return this.props.sections.map((section, index) => {
      return (
        <GuidePageSideNavItem key={index} id={section.id} onClick={this.onClickLink}>
          {section.name}
        </GuidePageSideNavItem>
      );
    });
  }

  render() {
    return (
      <div className="guidePage">
        <GuidePageSideNav title={this.props.title}>{this.renderSideNavMenu()}</GuidePageSideNav>

        <div className="guidePageBody">
          <div className="guidePageKillScreen">
            <h1 className="guideTitle">The Kibana UI Framework has been DEPRECATED.</h1>

            <h2 className="guideTitle">
              Please use the <a href="https://github.com/elastic/eui">EUI Framework instead</a>.
            </h2>
          </div>

          {this.props.children}
        </div>
      </div>
    );
  }
}

GuidePage.propTypes = {
  children: PropTypes.any,
  title: PropTypes.string,
  sections: PropTypes.array,
};
