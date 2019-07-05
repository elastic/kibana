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

import 'ngreact';
import React from 'react';
import classNames from 'classnames';

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

export class LoadingIndicator extends React.Component {
  state = {
    visible: false,
  };

  componentDidMount() {
    this._unsub = chrome.loadingCount.subscribe(count => {
      this.setState({
        visible: count > 0,
      });
    });
  }

  componentWillUnmount() {
    this._unsub();
    this._unsub = null;
  }

  render() {
    const className = classNames('kbnLoadingIndicator', this.state.visible ? null : 'hidden');

    const testSubj = this.state.visible
      ? 'globalLoadingIndicator'
      : 'globalLoadingIndicator-hidden';

    return (
      <div className={className} data-test-subj={testSubj}>
        <div className="kbnLoadingIndicator__bar essentialAnimation" />
      </div>
    );
  }
}

uiModules
  .get('app/kibana', ['react'])
  .directive('kbnLoadingIndicator', reactDirective => reactDirective(LoadingIndicator));
