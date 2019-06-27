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

import { EuiBetaBadge } from '@elastic/eui';
import React, { Component } from 'react';
import * as Rx from 'rxjs';

import { ChromeBadge } from '../../chrome_service';

interface Props {
  badge$: Rx.Observable<ChromeBadge | undefined>;
}

interface State {
  badge: ChromeBadge | undefined;
}

export class HeaderBadge extends Component<Props, State> {
  private subscription?: Rx.Subscription;

  constructor(props: Props) {
    super(props);

    this.state = { badge: undefined };
  }

  public componentDidMount() {
    this.subscribe();
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.badge$ === this.props.badge$) {
      return;
    }

    this.unsubscribe();
    this.subscribe();
  }

  public componentWillUnmount() {
    this.unsubscribe();
  }

  public render() {
    if (this.state.badge == null) {
      return null;
    }

    return (
      <div className="chrHeaderBadge__wrapper">
        <EuiBetaBadge
          data-test-subj="headerBadge"
          data-test-badge-label={this.state.badge.text}
          tabIndex={0}
          label={this.state.badge.text}
          tooltipContent={this.state.badge.tooltip}
          iconType={this.state.badge.iconType}
        />
      </div>
    );
  }

  private subscribe() {
    this.subscription = this.props.badge$.subscribe(badge => {
      this.setState({
        badge,
      });
    });
  }

  private unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }
}
