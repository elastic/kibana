/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

// TODO adjust interface when real data is available, this currently types TAB_CONTENT_MOCK
export interface PreviewContentConfig {
  id: number;
  name: string;
  query: {
    language: 'esql' | 'kql';
    query: string;
  };
  status: 'success' | 'running' | 'danger'; // status for now matches EuiHealth colors for mocking simplicity
}
export interface TabPreviewProps {
  children: React.ReactNode;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  previewContent: PreviewContentConfig;
  stopPreviewOnHover?: boolean;
  previewDelay?: number;
}

export type TabMenuItem = TabMenuItemWithClick | 'divider';

export type GetTabMenuItems = (item: TabItem) => TabMenuItem[];
