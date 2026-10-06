/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { Component } from 'react';
import type {
  ChromeBreadcrumb,
  AppMountParameters,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { ManagementApp } from '../../utils';
interface ManagementSectionWrapperProps {
  app: ManagementApp;
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], history?: ScopedHistory) => void;
  onAppMounted: (id: string) => void;
  history: AppMountParameters['history'];
  theme: ThemeServiceStart;
}
interface ManagementSectionWrapperState {
  error: Error | null;
}
export declare class ManagementAppWrapper extends Component<
  ManagementSectionWrapperProps,
  ManagementSectionWrapperState
> {
  private unmount?;
  private mountElementRef;
  constructor(props: ManagementSectionWrapperProps);
  componentDidMount(): void;
  componentWillUnmount(): Promise<void>;
  render(): React.JSX.Element;
}
export {};
