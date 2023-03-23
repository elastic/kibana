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
export const INTEGRATION_CATEGORY_DISPLAY: {
  [key: string]: { title: string; parent_id?: string };
} = {
  aws: { title: 'AWS', parent_id: undefined },
  azure: { title: 'Azure', parent_id: undefined },
  cloud: { title: 'Cloud', parent_id: undefined },
  config_management: { title: 'Config management', parent_id: undefined },
  containers: { title: 'Containers', parent_id: undefined },
  crm: { title: 'CRM', parent_id: undefined },
  custom: { title: 'Custom', parent_id: undefined },
  datastore: { title: 'Datastore', parent_id: undefined },
  elastic_stack: { title: 'Elastic Stack', parent_id: undefined },
  google_cloud: { title: 'Google Cloud', parent_id: undefined },
  infrastructure: { title: 'Infrastructure', parent_id: undefined },
  kubernetes: { title: 'Kubernetes', parent_id: undefined },
  languages: { title: 'Languages', parent_id: undefined },
  message_queue: { title: 'Message queue', parent_id: undefined },
  microsoft_365: { title: 'Microsoft 365', parent_id: undefined },
  monitoring: { title: 'Monitoring', parent_id: undefined },
  network: { title: 'Network', parent_id: undefined },
  notification: { title: 'Notification', parent_id: undefined },
  os_system: { title: 'OS & System', parent_id: undefined },
  productivity: { title: 'Productivity', parent_id: undefined },
  security: { title: 'Security', parent_id: undefined },
  sample_data: { title: 'Sample data', parent_id: undefined },
  support: { title: 'Support', parent_id: undefined },
  threat_intel: { title: 'Threat intelligence', parent_id: undefined },
  ticketing: { title: 'Ticketing', parent_id: undefined },
  version_control: { title: 'Version control', parent_id: undefined },
  web: { title: 'Web', parent_id: undefined },

  // Kibana added
  communications: { title: 'Communications', parent_id: undefined },
  enterprise_search: { title: 'Enterprise search', parent_id: undefined },
  file_storage: { title: 'File storage', parent_id: undefined },
  language_client: { title: 'Language client', parent_id: undefined },
  upload_file: { title: 'Upload a file', parent_id: undefined },
  website_search: { title: 'Website search', parent_id: undefined },
  geo: { title: 'Geo', parent_id: undefined },
};

// featured integrations will be brought to the top of the search results for
// a given category. Integrations are displayed in the order of the array.
export const FEATURED_INTEGRATIONS_BY_CATEGORY = {
  security: ['endpoint', 'cloud_security_posture', 'network_traffic'],
  '': ['apm', 'endpoint', 'web_crawler'], // no category selected
};

/**
 * A category applicable to an Integration.
 */
export type IntegrationCategory = string;

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
  placeholders: 'Extra Integrations',
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
  uiExternalLink?: string;
  isBeta: boolean;
  icons: CustomIntegrationIcon[];
  categories: IntegrationCategory[];
  shipper: Shipper;
  eprOverlap?: string; // name of the equivalent Elastic Agent integration in EPR. e.g. a beat module can correspond to an EPR-package, or an APM-tutorial. When completed, Integrations-UX can preferentially show the EPR-package, rather than the custom-integration
}

export const ROUTES_APPEND_CUSTOM_INTEGRATIONS = `/internal/${PLUGIN_ID}/appendCustomIntegrations`;
export const ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS = `/internal/${PLUGIN_ID}/replacementCustomIntegrations`;
