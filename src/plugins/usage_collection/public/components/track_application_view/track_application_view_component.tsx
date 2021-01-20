/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Component } from 'react';
import ReactDOM from 'react-dom';
import { IApplicationUsageTracker } from '../../plugin';
import { TrackApplicationViewProps } from './types';

interface Props extends TrackApplicationViewProps {
  applicationUsageTracker?: IApplicationUsageTracker;
}

export class TrackApplicationViewComponent extends Component<Props> {
  onClick = () => {
    const { applicationUsageTracker, viewId } = this.props;
    applicationUsageTracker?.updateViewClickCounter(viewId);
  };

  componentDidMount() {
    const { applicationUsageTracker, viewId } = this.props;
    if (applicationUsageTracker) {
      applicationUsageTracker.trackApplicationViewUsage(viewId);
      ReactDOM.findDOMNode(this)?.parentNode?.addEventListener('click', this.onClick);
    }
  }

  componentWillUnmount() {
    const { applicationUsageTracker, viewId } = this.props;
    if (applicationUsageTracker) {
      applicationUsageTracker.flushTrackedView(viewId);
      ReactDOM.findDOMNode(this)?.parentNode?.removeEventListener('click', this.onClick);
    }
  }

  render() {
    return this.props.children;
  }
}
