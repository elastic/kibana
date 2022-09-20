/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';

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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/javascript-api/{branch}/introduction.html`,
    integrationsAppUrl: `/app/integrations/language_clients/javascript/overview`,
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/ruby-api/{branch}/ruby_client.html`,
    integrationsAppUrl: `/app/integrations/language_clients/ruby/overview`,
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/net-api/{branch}/index.html`,
    integrationsAppUrl: `/app/integrations/language_clients/dotnet/overview`,
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/php-api/{branch}/index.html`,
    integrationsAppUrl: `/app/integrations/language_clients/php/overview`,
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/perl-api/{branch}/index.html`,
    integrationsAppUrl: `/app/integrations/language_clients/perl/overview`,
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/python-api/{branch}/index.html`,
    integrationsAppUrl: `/app/integrations/language_clients/python/overview`,
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/rust-api/{branch}/index.html`,
    integrationsAppUrl: `/app/integrations/language_clients/rust/overview`,
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/java-api-client/{branch}/index.html`,
    integrationsAppUrl: `/app/integrations/language_clients/java/overview`,
    exportLanguageUiComponent: false,
  },
];
