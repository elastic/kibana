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
import type { estypes } from '@elastic/elasticsearch';
import { type EuiSearchBarOnChangeArgs } from '@elastic/eui';
import type { Request } from '../../../../../../common/adapters/request/types';
import type { DetailViewProps } from '../types';
interface State {
  clusters: Record<string, estypes.ClusterDetails>;
  showSearchAndStatusBar: boolean;
}
export declare class ClustersView extends Component<DetailViewProps, State> {
  static shouldShow: (request: Request, isCpsMultiProject?: boolean) => boolean;
  constructor(props: DetailViewProps);
  _onSearchChange: ({ query, error }: EuiSearchBarOnChangeArgs) => void;
  render(): React.JSX.Element;
}
export {};
