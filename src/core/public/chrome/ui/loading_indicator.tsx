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

import React from 'react';
import classNames from 'classnames';
import { Subscription } from 'rxjs';

import { HttpStart } from '../../http';

export interface LoadingIndicatorProps {
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
}

export class LoadingIndicator extends React.Component<LoadingIndicatorProps, { visible: boolean }> {
  private loadingCountSubscription?: Subscription;

  state = {
    visible: false,
  };

  componentDidMount() {
    this.loadingCountSubscription = this.props.loadingCount$.subscribe(count => {
      this.setState({
        visible: count > 0,
      });
    });
  }

  componentWillUnmount() {
    if (this.loadingCountSubscription) {
      this.loadingCountSubscription.unsubscribe();
      this.loadingCountSubscription = undefined;
    }
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
