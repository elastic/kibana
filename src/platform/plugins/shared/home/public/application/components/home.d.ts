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
import type { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../services';
export declare const KEY_ENABLE_WELCOME = 'home:welcome:show';
export interface HomeProps {
  addBasePath: (url: string) => string;
  directories: FeatureCatalogueEntry[];
  solutions: FeatureCatalogueSolution[];
  localStorage: Storage;
  urlBasePath: string;
  hasDataView: () => Promise<boolean>;
  isCloudEnabled: boolean;
}
interface State {
  isLoading: boolean;
  isNewKibanaInstance: boolean;
  isWelcomeEnabled: boolean;
}
export declare class Home extends Component<HomeProps, State> {
  private _isMounted;
  constructor(props: HomeProps);
  componentWillUnmount(): void;
  componentDidMount(): void;
  private fetchIsNewKibanaInstance;
  private endLoading;
  skipWelcome(): void;
  private findDirectoryById;
  private getFeaturesByCategory;
  private renderNormal;
  private renderLoading;
  private renderWelcome;
  render(): string | React.JSX.Element;
}
export {};
