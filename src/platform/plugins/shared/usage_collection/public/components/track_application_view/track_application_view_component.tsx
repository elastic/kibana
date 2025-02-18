/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { IApplicationUsageTracker } from '../../plugin';
import { TrackApplicationViewProps } from './types';

interface Props extends TrackApplicationViewProps {
  applicationUsageTracker?: IApplicationUsageTracker;
}

export class TrackApplicationViewComponent extends React.Component<Props> {
  private parentNode: (Node & ParentNode) | null | undefined;

  onClick = (e: MouseEvent) => {
    const { applicationUsageTracker, viewId } = this.props;
    this.parentNode = this.parentNode || ReactDOM.findDOMNode(this)?.parentNode;
    if (this.parentNode === e.target || this.parentNode?.contains(e.target as Node | null)) {
      applicationUsageTracker?.updateViewClickCounter(viewId);
    }
  };

  componentDidMount() {
    const { applicationUsageTracker, viewId } = this.props;
    if (applicationUsageTracker) {
      applicationUsageTracker.trackApplicationViewUsage(viewId);
      document.addEventListener('click', this.onClick);
    }
  }

  componentWillUnmount() {
    const { applicationUsageTracker, viewId } = this.props;
    if (applicationUsageTracker) {
      applicationUsageTracker.flushTrackedView(viewId);
    }
    document.removeEventListener('click', this.onClick);
  }

  render() {
    return this.props.children;
  }
}
