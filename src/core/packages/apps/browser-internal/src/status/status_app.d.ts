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
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import { type ProcessedServerResponse } from './lib';
interface StatusAppProps {
  http: InternalHttpSetup;
  notifications: NotificationsSetup;
  getDocLinks: () => DocLinksStart | undefined;
}
interface StatusAppState {
  loading: boolean;
  fetchError: boolean;
  data: ProcessedServerResponse | null;
}
export declare class StatusApp extends Component<StatusAppProps, StatusAppState> {
  constructor(props: StatusAppProps);
  componentDidMount(): Promise<void>;
  private renderRedactedView;
  render(): React.JSX.Element;
}
export {};
