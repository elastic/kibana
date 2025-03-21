/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Query } from '@kbn/es-query';
import type { CoreStart } from '@kbn/core/public';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabMenuItemWithClick {
  'data-test-subj': string;
  name: string;
  label: string;
  onClick: () => void;
}

export interface TabsSizeConfig {
  isScrollable: boolean;
  regularTabMaxWidth: number;
  regularTabMinWidth: number;
  // TODO: extend with possibly different sizes for pinned tabs
}

// TODO status value for now matches EuiHealth colors for mocking simplicity, adjust when real data is available
export enum TabStatus {
  SUCCESS = 'success',
  RUNNING = 'running',
  ERROR = 'danger',
}

// TODO adjust interface when real data is available, this currently types TAB_CONTENT_MOCK
export interface TabPreviewData {
  query: AggregateQuery | Query;
  status: TabStatus;
}

export type TabMenuItem = TabMenuItemWithClick | 'divider';

export type GetTabMenuItems = (item: TabItem) => TabMenuItem[];

export interface TabsServices {
  core: {
    chrome?: CoreStart['chrome'];
  };
}
