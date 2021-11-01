/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'customIntegrations';
export const PLUGIN_NAME = 'customIntegrations';

/**
 * A map of category names and their corresponding titles.
 */
// TODO: consider i18n
export const INTEGRATION_CATEGORY_DISPLAY = {
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
  communication: 'Communication',
  customer_support: 'Customer Support',
  document_storage: 'Document Storage',
  enterprise_management: 'Enterprise Management',
  knowledge_platform: 'Knowledge Platform',
  language_client: 'Language client',
  project_management: 'Project Management',
  software_development: 'Software Development',
  upload_file: 'Upload a file',
  website_search: 'Website Search',
};

/**
 * A category applicable to an Integration.
 */
export type IntegrationCategory = keyof typeof INTEGRATION_CATEGORY_DISPLAY;

/**
 * The list of all available categories.
 */
// This `as` is necessary, as Object.keys cannot be strongly typed.
// see: https://github.com/Microsoft/TypeScript/issues/12870
export const category = Object.keys(INTEGRATION_CATEGORY_DISPLAY) as IntegrationCategory[];

/**
 * An object containing the id of an `IntegrationCategory` and the count of all Integrations in that category.
 */
export interface IntegrationCategoryCount {
  count: number;
  id: IntegrationCategory;
}

/**
 * A map of shipper names and their corresponding titles.
 */
// TODO: consider i18n
export const SHIPPER_DISPLAY = {
  beats: 'Beats',
  enterprise_search: 'Enterprise Search',
  language_clients: 'Language clients',
  other: 'Other',
  sample_data: 'Sample data',
  tests: 'Tests',
  tutorial: 'Tutorials',
};

/**
 * A shipper-- an internal or external system capable of storing data in ES/Kibana-- applicable to an Integration.
 */
export type Shipper = keyof typeof SHIPPER_DISPLAY;

/**
 * The list of all known shippers.
 */
// This `as` is necessary, as Object.keys cannot be strongly typed.
// see: https://github.com/Microsoft/TypeScript/issues/12870
export const shipper = Object.keys(SHIPPER_DISPLAY) as Shipper[];

/**
 * An icon representing an Integration.
 */
export interface CustomIntegrationIcon {
  src: string;
  type: 'eui' | 'svg';
}

/**
 * A definition of a dataintegration, which can be registered with Kibana.
 */
export interface CustomIntegration {
  id: string;
  title: string;
  description: string;
  type: 'ui_link';
  uiInternalPath: string;
  isBeta: boolean;
  icons: CustomIntegrationIcon[];
  categories: IntegrationCategory[];
  shipper: Shipper;
  eprOverlap?: string; // name of the equivalent Elastic Agent integration in EPR. e.g. a beat module can correspond to an EPR-package, or an APM-tutorial. When completed, Integrations-UX can preferentially show the EPR-package, rather than the custom-integration
}

export const ROUTES_APPEND_CUSTOM_INTEGRATIONS = `/internal/${PLUGIN_ID}/appendCustomIntegrations`;
export const ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS = `/internal/${PLUGIN_ID}/replacementCustomIntegrations`;
