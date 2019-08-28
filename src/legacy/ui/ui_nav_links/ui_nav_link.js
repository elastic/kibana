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

export class UiNavLink {
  constructor(spec) {
    const {
      id,
      title,
      order = 0,
      url,
      subUrlBase,
      icon,
      euiIconType,
      linkToLastSubUrl = true,
      hidden = false,
      disabled = false,
      tooltip = '',
    } = spec;

    this._id = id;
    this._title = title;
    this._order = order;
    this._url = url;
    this._subUrlBase = subUrlBase || url;
    this._icon = icon;
    this._euiIconType = euiIconType;
    this._linkToLastSubUrl = linkToLastSubUrl;
    this._hidden = hidden;
    this._disabled = disabled;
    this._tooltip = tooltip;
  }

  getOrder() {
    return this._order;
  }

  toJSON() {
    return {
      id: this._id,
      title: this._title,
      order: this._order,
      url: this._url,
      subUrlBase: this._subUrlBase,
      icon: this._icon,
      euiIconType: this._euiIconType,
      linkToLastSubUrl: this._linkToLastSubUrl,
      hidden: this._hidden,
      disabled: this._disabled,
      tooltip: this._tooltip,
    };
  }
}
