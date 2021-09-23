/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'customIntegrations';
export const PLUGIN_NAME = 'customIntegrations';

export interface CategoryCount {
  count: number;
  id: Category;
}

export const CATEGORY_DISPLAY = {
  aws: 'AWS',
  azure: 'Azure',
  cloud: 'Cloud',
  config_management: 'Config management',
  containers: 'Containers',
  crm: 'CRM',
  custom: 'Custom',
  datastore: 'Datastore',
  elastic_stack: 'Elastic Stack',
  google_cloud: 'Google cloud',
  kubernetes: 'Kubernetes',
  languages: 'Languages',
  message_queue: 'Message queue',
  monitoring: 'Monitoring',
  network: 'Network',
  notification: 'Notification',
  os_system: 'OS & System',
  productivity: 'Productivity',
  security: 'Security',
  sample_data: 'Sample data',
  support: 'Support',
  ticketing: 'Ticketing',
  version_control: 'Version control',
  web: 'Web',
  upload_file: 'Upload a file',

  updates_available: 'Updates available',
};

export type Category = keyof typeof CATEGORY_DISPLAY;

export interface CustomIntegration {
  id: string;
  title: string;
  name: string;
  description: string;
  type: 'ui_link';
  uiInternalPath: string;
  isBeta: boolean;
  icons: Array<{ src: string; type: string }>;
  categories: Category[];
  shipper: string;
}

export const ROUTES_ADDABLECUSTOMINTEGRATIONS = `/api/${PLUGIN_ID}/addableCustomIntegrations`;
