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

import classNames from 'classnames';
import React, { Component } from 'react';
import * as Rx from 'rxjs';

import { EuiHeaderBreadcrumbs } from '@elastic/eui';
import { ChromeBreadcrumb } from '../../chrome_service';

interface Props {
  appTitle?: string;
  breadcrumbs$: Rx.Observable<ChromeBreadcrumb[]>;
}

interface State {
  breadcrumbs: ChromeBreadcrumb[];
}

export class HeaderBreadcrumbs extends Component<Props, State> {
  private subscription?: Rx.Subscription;

  constructor(props: Props) {
    super(props);

    this.state = { breadcrumbs: [] };
  }

  public componentDidMount() {
    this.subscribe();
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.breadcrumbs$ === this.props.breadcrumbs$) {
      return;
    }

    this.unsubscribe();
    this.subscribe();
  }

  public componentWillUnmount() {
    this.unsubscribe();
  }

  public render() {
    return (
      <EuiHeaderBreadcrumbs
        breadcrumbs={this.getBreadcrumbs()}
        max={10}
        data-test-subj="breadcrumbs"
      />
    );
  }

  private subscribe() {
    this.subscription = this.props.breadcrumbs$.subscribe(breadcrumbs => {
      this.setState({
        breadcrumbs,
      });
    });
  }

  private unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      delete this.subscription;
    }
  }

  private getBreadcrumbs() {
    let breadcrumbs = this.state.breadcrumbs;

    if (breadcrumbs.length === 0 && this.props.appTitle) {
      breadcrumbs = [{ text: this.props.appTitle }];
    }

    return breadcrumbs.map((breadcrumb, i) => ({
      ...breadcrumb,
      'data-test-subj': classNames(
        'breadcrumb',
        breadcrumb['data-test-subj'],
        i === 0 && 'first',
        i === breadcrumbs.length - 1 && 'last'
      ),
    }));
  }
}
