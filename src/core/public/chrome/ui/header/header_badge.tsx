/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBetaBadge } from '@elastic/eui';
import React, { Component } from 'react';
import * as Rx from 'rxjs';

import { ChromeBadge } from '../../types';

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
    this.subscription = this.props.badge$.subscribe((badge) => {
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
