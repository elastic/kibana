/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'customIntegrations';
export const PLUGIN_NAME = 'customIntegrations';

export interface IntegrationCategoryCount {
  count: number;
  id: IntegrationCategory;
}

export const INTEGRATION_CATEGORY_DISPLAY = {
  // Known EPR
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

  // Kibana added
  upload_file: 'Upload a file',
  language_client: 'Language client',

  // Internal
  updates_available: 'Updates available',
};

export type IntegrationCategory = keyof typeof INTEGRATION_CATEGORY_DISPLAY;

export interface CustomIntegrationIcon {
  src: string;
  type: 'eui' | 'svg';
}

export interface CustomIntegration {
  id: string;
  title: string;
  description: string;
  type: 'ui_link';
  uiInternalPath: string;
  isBeta: boolean;
  icons: CustomIntegrationIcon[];
  categories: IntegrationCategory[];
  shipper: string;
  eprOverlap?: string; // name of the equivalent Elastic Agent integration in EPR. e.g. a beat module can correspond to an EPR-package, or an APM-tutorial. When completed, Integrations-UX can preferentially show the EPR-package, rather than the custom-integration
}

export const ROUTES_APPEND_CUSTOM_INTEGRATIONS = `/internal/${PLUGIN_ID}/appendCustomIntegrations`;
export const ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS = `/internal/${PLUGIN_ID}/replacementCustomIntegrations`;
