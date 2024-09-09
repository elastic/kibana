/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  advanced_analytics_ueba: { title: 'Advanced Analytics (UEBA', parent_id: 'security' },
  analytics_engine: { title: 'Analytics Engine', parent_id: 'observability' },
  application_observability: { title: 'Application', parent_id: 'observability' },
  app_search: { title: 'Application Search', parent_id: 'enterprise_search' },
  auditd: { title: 'AuditD', parent_id: 'security' },
  authentication: { title: 'Authentication', parent_id: 'security' },
  aws: { title: 'AWS', parent_id: undefined },
  azure: { title: 'Azure', parent_id: undefined },
  big_data: { title: 'Big Data', parent_id: 'observability' },
  cdn_security: { title: 'Content Delivery Network', parent_id: 'security' },
  cloud: { title: 'Cloud', parent_id: undefined },
  config_management: { title: 'Config management', parent_id: undefined },
  connector: { title: 'Connector', parent_id: 'enterprise_search' },
  connector_client: { title: 'Connector Client', parent_id: 'enterprise_search' },
  containers: { title: 'Containers', parent_id: undefined },
  crawler: { title: 'Crawler', parent_id: 'enterprise_search' },
  credential_management: { title: 'Credential Management', parent_id: 'security' },
  crm: { title: 'CRM', parent_id: undefined },
  custom: { title: 'Custom', parent_id: undefined },
  custom_logs: { title: 'Custom Logs', parent_id: 'custom' },
  database_security: { title: 'Database', parent_id: 'security' },
  datastore: { title: 'Database', parent_id: undefined },
  dns_security: { title: 'DNS', parent_id: 'security' },
  edr_xdr: { title: 'EDR/XDR', parent_id: 'security' },
  cloudsecurity_cdr: { title: 'Cloud Security/CDR', parent_id: 'security' },
  elasticsearch_sdk: { title: 'Elasticsearch SDK', parent_id: undefined },
  elastic_stack: { title: 'Elastic Stack', parent_id: undefined },
  email_security: { title: 'Email', parent_id: 'security' },
  enterprise_search: { title: 'Search', parent_id: undefined },
  firewall_security: { title: 'Firewall', parent_id: 'security' },
  google_cloud: { title: 'Google Cloud', parent_id: undefined },
  iam: { title: 'Identity and Access Management', parent_id: 'security' },
  ids_ips: { title: 'IDS/IPS', parent_id: 'security' },
  infrastructure: { title: 'Infrastructure', parent_id: undefined },
  java_observability: { title: 'Java', parent_id: 'observability' },
  kubernetes: { title: 'Kubernetes', parent_id: 'observability' },
  language_client: { title: 'Language Client', parent_id: 'enterprise_search' },
  languages: { title: 'Languages', parent_id: undefined },
  load_balancer: { title: 'Load Balancer', parent_id: 'observability' },
  message_queue: { title: 'Message Broker', parent_id: 'observability' },
  monitoring: { title: 'Monitoring', parent_id: 'observability' },
  native_search: { title: 'Native Search', parent_id: 'enterprise_search' },
  network: { title: 'Network', parent_id: undefined },
  network_security: { title: 'Network', parent_id: 'security' },
  notification: { title: 'Notification', parent_id: 'observability' },
  observability: { title: 'Observability', parent_id: undefined },
  os_system: { title: 'Operating Systems', parent_id: undefined },
  process_manager: { title: 'Process Manager', parent_id: 'observability' },
  productivity: { title: 'Productivity', parent_id: undefined },
  productivity_security: { title: 'Productivity', parent_id: 'security' },
  proxy_security: { title: 'Proxy', parent_id: 'security' },
  sdk_search: { title: 'SDK', parent_id: 'enterprise_search' },
  security: { title: 'Security', parent_id: undefined },
  stream_processing: { title: 'Stream Processing', parent_id: 'observability' },
  support: { title: 'Support', parent_id: undefined },
  threat_intel: { title: 'Threat Intelligence', parent_id: 'security' },
  ticketing: { title: 'Ticketing', parent_id: undefined },
  version_control: { title: 'Version Control', parent_id: undefined },
  virtualization: { title: 'Virtualization Platform', parent_id: 'observability' },
  vpn_security: { title: 'VPN', parent_id: 'security' },
  vulnerability_management: { title: 'Vulnerability Management', parent_id: 'security' },
  web: { title: 'Web Server', parent_id: 'observability' },
  web_application_firewall: { title: 'Web Application Firewall', parent_id: 'security' },
  websphere: { title: 'WebSphere Application Server', parent_id: 'observability' },
  workplace_search_content_source: {
    title: 'Workplace Search Content Source',
    parent_id: 'enterprise_search',
  },
  // Kibana added
  apm: { title: 'APM', parent_id: undefined },
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
  enterprise_search: 'Search',
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
