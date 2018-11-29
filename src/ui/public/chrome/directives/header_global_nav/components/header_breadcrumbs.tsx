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
import * as Rx from 'rxjs';

import {
  // @ts-ignore
  EuiHeaderBreadcrumbs,
} from '@elastic/eui';

import { Breadcrumb } from '../../../../../../core/public/chrome';

interface Props {
  appTitle?: string;
  breadcrumbs$: Rx.Observable<Breadcrumb[]>;
}

interface State {
  breadcrumbs: Breadcrumb[];
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
    let breadcrumbs = this.state.breadcrumbs;

    if (breadcrumbs.length === 0 && this.props.appTitle) {
      breadcrumbs = [{ text: this.props.appTitle }];
    }

    return <EuiHeaderBreadcrumbs breadcrumbs={breadcrumbs} />;
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
}
