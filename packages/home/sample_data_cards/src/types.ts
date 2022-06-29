/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface AppLink {
  icon: string;
  label: string;
  order?: number;
  path: string;
  'data-test-subj'?: string;
}

export type InstalledStatus = 'installed' | 'not_installed' | 'unknown';

export interface SampleDataSet {
  appLinks: AppLink[];
  defaultIndex: string;
  description: string;
  id: string;
  name: string;
  overviewDashboard: string;
  previewImagePath: string;
  darkPreviewImagePath?: string;
  iconPath?: string;
  status?: InstalledStatus;
  statusMsg?: string;
}
