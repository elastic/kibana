/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

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
  google_cloud: 'Google Cloud',
  kubernetes: 'Kubernetes',
  languages: 'Languages',
  message_queue: 'Message queue',
  microsoft_365: 'Microsoft 365',
  monitoring: 'Monitoring',
  network: 'Network',
  notification: 'Notification',
  os_system: 'OS & System',
  productivity: 'Productivity',
  security: 'Security',
  sample_data: 'Sample data',
  support: 'Support',
  threat_intel: 'Threat intelligence',
  ticketing: 'Ticketing',
  version_control: 'Version control',
  web: 'Web',

  // Kibana added
  communications: 'Communications',
  enterprise_search: 'Enterprise search',
  file_storage: 'File storage',
  language_client: 'Language client',
  upload_file: 'Upload a file',
  website_search: 'Website search',
  geo: 'Geo',
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

/*
 * Definitions for the language integrations
 */
const ELASTIC_WEBSITE_URL = 'https://www.elastic.co';
const ELASTICSEARCH_CLIENT_URL = `${ELASTIC_WEBSITE_URL}/guide/en/elasticsearch/client`;

/*
  - exportLanguageUiComponent: controls whether the integration should export a UI component for language clients to Fleet UI;
    if false, the URL falls back to `docUrlTemplate`; this logic is handled in `registerCustomIntegration`
  - integrationsAppUrl: url in Integrations App where the components defined under `public/components/fleet_integration` will be rendered
      only exported when `exportLanguageUiComponent` is true
*/
export interface LanguageIntegration {
  id: string;
  title: string;
  icon?: string;
  euiIconName?: string;
  description: string;
  docUrlTemplate: string;
  integrationsAppUrl: string;
  exportLanguageUiComponent: boolean;
}

export const languageIntegrations: LanguageIntegration[] = [
  {
    id: 'javascript',
    title: i18n.translate('customIntegrations.languageclients.JavascriptTitle', {
      defaultMessage: 'Elasticsearch JavaScript Client',
    }),
    icon: 'nodejs.svg',
    description: i18n.translate('customIntegrations.languageclients.JavascriptDescription', {
      defaultMessage: 'Index data to Elasticsearch with the JavaScript client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/javascript/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/javascript-api/{branch}/introduction.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'ruby',
    title: i18n.translate('customIntegrations.languageclients.RubyTitle', {
      defaultMessage: 'Elasticsearch Ruby Client',
    }),
    icon: 'ruby.svg',
    description: i18n.translate('customIntegrations.languageclients.RubyDescription', {
      defaultMessage: 'Index data to Elasticsearch with the Ruby client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/ruby/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/ruby-api/{branch}/ruby_client.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'go',
    title: i18n.translate('customIntegrations.languageclients.GoTitle', {
      defaultMessage: 'Elasticsearch Go Client',
    }),
    icon: 'go.svg',
    description: i18n.translate('customIntegrations.languageclients.GoDescription', {
      defaultMessage: 'Index data to Elasticsearch with the Go client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/go/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/go-api/{branch}/overview.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'dotnet',
    title: i18n.translate('customIntegrations.languageclients.DotNetTitle', {
      defaultMessage: 'Elasticsearch .NET Client',
    }),
    icon: 'dotnet.svg',
    description: i18n.translate('customIntegrations.languageclients.DotNetDescription', {
      defaultMessage: 'Index data to Elasticsearch with the .NET client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/dotnet/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/net-api/{branch}/index.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'php',
    title: i18n.translate('customIntegrations.languageclients.PhpTitle', {
      defaultMessage: 'Elasticsearch PHP Client',
    }),
    icon: 'php.svg',
    description: i18n.translate('customIntegrations.languageclients.PhpDescription', {
      defaultMessage: 'Index data to Elasticsearch with the PHP client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/php/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/php-api/{branch}/index.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'perl',
    title: i18n.translate('customIntegrations.languageclients.PerlTitle', {
      defaultMessage: 'Elasticsearch Perl Client',
    }),
    icon: 'perl.svg',
    description: i18n.translate('customIntegrations.languageclients.PerlDescription', {
      defaultMessage: 'Index data to Elasticsearch with the Perl client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/perl/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/perl-api/{branch}/index.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'python',
    title: i18n.translate('customIntegrations.languageclients.PythonTitle', {
      defaultMessage: 'Elasticsearch Python Client',
    }),
    icon: 'python.svg',
    description: i18n.translate('customIntegrations.languageclients.PythonDescription', {
      defaultMessage: 'Index data to Elasticsearch with the Python client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/python/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/python-api/{branch}/index.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'rust',
    title: i18n.translate('customIntegrations.languageclients.RustTitle', {
      defaultMessage: 'Elasticsearch Rust Client',
    }),
    icon: 'rust.svg',
    description: i18n.translate('customIntegrations.languageclients.RustDescription', {
      defaultMessage: 'Index data to Elasticsearch with the Rust client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/rust/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/rust-api/{branch}/index.html`,
    exportLanguageUiComponent: false,
  },
  {
    id: 'java',
    title: i18n.translate('customIntegrations.languageclients.JavaTitle', {
      defaultMessage: 'Elasticsearch Java Client',
    }),
    icon: 'java.svg',
    description: i18n.translate('customIntegrations.languageclients.JavaDescription', {
      defaultMessage: 'Index data to Elasticsearch with the Java client.',
    }),
    integrationsAppUrl: `/app/integrations/language_clients/java/overview`,
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/java-api-client/{branch}/index.html`,
    exportLanguageUiComponent: false,
  },
];
