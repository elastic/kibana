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
import type { Request } from '../../../../common/adapters/request/types';
import type { InspectorViewProps } from '../../../types';
interface RequestSelectorState {
  requests: Request[];
  request: Request | null;
}
export declare class RequestsViewComponent extends Component<
  InspectorViewProps,
  RequestSelectorState
> {
  constructor(props: InspectorViewProps);
  getRequests(): Request[];
  _onRequestsChange: () => void;
  selectRequest: (request: Request) => void;
  componentWillUnmount(): void;
  static renderEmptyRequests(): React.JSX.Element;
  render(): React.JSX.Element;
}
export {};
