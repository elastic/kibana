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

import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * GlobalBannerList is a list of "banners". A banner something that is displayed at the top of Kibana that may or may not disappear.
 *
 * Whether or not a banner can be closed is completely up to the author of the banner. Some banners make sense to be static, such as
 * banners meant to indicate the sensitivity (e.g., classification) of the information being represented.
 *
 * Banners are currently expected to be <EuiCallout /> instances, but that is not required.
 *
 * @param {Array} banners The array of banners represented by objects in the form of { id, component }.
 */
export class GlobalBannerList extends Component {
  static propTypes = {
    banners: PropTypes.array,
    subscribe: PropTypes.func,
  };

  static defaultProps = {
    banners: [],
  };

  constructor(props) {
    super(props);

    if (this.props.subscribe) {
      this.props.subscribe(() => this.forceUpdate());
    }
  }

  render() {
    if (this.props.banners.length === 0) {
      return null;
    }

    const flexBanners = this.props.banners.map(banner => {
      const { id, component, priority, ...rest } = banner;

      return (
        <div key={id} data-test-priority={priority} className="kbnGlobalBannerList__item" {...rest}>
          {component}
        </div>
      );
    });

    return <div className="kbnGlobalBannerList">{flexBanners}</div>;
  }
}
