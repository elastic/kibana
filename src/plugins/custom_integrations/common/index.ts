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
  analytics_engine: 'Analytics Engine',
  application_observability: 'Application',
  app_search: 'Application Search',
  auditd: 'AuditD',
  authentication: 'Authentication',
  aws: 'AWS',
  azure: 'Azure',
  big_data: 'Big Data',
  cdn_security: 'Content Delivery Network',
  cloud: 'Cloud',
  config_management: 'Config management',
  connector: 'Connector',
  connector_client: 'Connector Client',
  connector_package: 'Connector Package',
  containers: 'Containers',
  content_source: 'Content Source',
  crawler: 'Crawler',
  credential_management: 'Credential Management',
  crm: 'CRM',
  custom: 'Custom',
  custom_logs: 'Custom Logs',
  database_security: 'Database',
  datastore: 'Database',
  dns_security: 'DNS',
  edr_xdr: 'EDR/XDR',
  elasticsearch_sdk: 'Elasticsearch SDK',
  elastic_stack: 'Elastic Stack',
  email_security: 'Email',
  enterprise_search: 'Enterprise Search',
  firewall_security: 'Firewall',
  google_cloud: 'Google Cloud',
  iam: 'Identity and Access Management',
  ids_ips: 'IDS/IPS',
  infrastructure: 'Infrastructure',
  java_observability: 'Java',
  kubernetes: 'Kubernetes',
  language_client: 'Language Client',
  languages: 'Languages',
  load_balancer: 'Load Balancer',
  message_queue: 'Message Broker',
  monitoring: 'Monitoring',
  native_search: 'Native Search',
  network: 'Network',
  network_security: 'Network',
  notification: 'Notification',
  observability: 'Observability',
  os_system: 'Operating Systems',
  process_manager: 'Process Manager',
  productivity: 'Productivity',
  productivity_security: 'Productivity',
  proxy_security: 'Proxy',
  sdk_search: 'SDK',
  security: 'Security',
  stream_processing: 'Stream Processing',
  support: 'Support',
  threat_intel: 'Threat Intelligence',
  ticketing: 'Ticketing',
  version_control: 'Version Control',
  virtualization: 'Virtualization Platform',
  vpn_security: 'VPN',
  vulnerability_management: 'Vulnerability Management',
  web: 'Web Server',
  web_application_firewall: 'Web Application Firewall',
  websphere: 'WebSphere Application Server',
  workplace_search: 'Workplace Search',

  // Kibana added
  apm: 'APM',
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
