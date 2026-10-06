/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IApplicationUsageTracker } from '../../plugin';
import type { TrackApplicationViewProps } from './types';
interface Props extends TrackApplicationViewProps {
  applicationUsageTracker?: IApplicationUsageTracker;
}
export declare class TrackApplicationViewComponent extends React.Component<Props> {
  private parentNode;
  onClick: (e: MouseEvent) => void;
  componentDidMount(): void;
  componentWillUnmount(): void;
  render(): React.ReactNode;
}
export {};
