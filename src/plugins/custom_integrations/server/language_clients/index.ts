/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/server';
import { CustomIntegrationRegistry } from '../custom_integration_registry';
import { CustomIntegrationIcon, PLUGIN_ID } from '../../common';

interface LanguageIntegration {
  id: string;
  title: string;
  icon?: string;
  euiIconName?: string;
  description: string;
  docUrlTemplate: string;
}

const ELASTIC_WEBSITE_URL = 'https://www.elastic.co';
const ELASTICSEARCH_CLIENT_URL = `${ELASTIC_WEBSITE_URL}/guide/en/elasticsearch/client`;
export const integrations: LanguageIntegration[] = [
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
    docUrlTemplate: `${ELASTICSEARCH_CLIENT_URL}/go-api/{branch}/overview.html`,
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
  },
];

export function registerLanguageClients(
  core: CoreSetup,
  registry: CustomIntegrationRegistry,
  branch: string
) {
  integrations.forEach((integration: LanguageIntegration) => {
    const icons: CustomIntegrationIcon[] = [];
    if (integration.euiIconName) {
      icons.push({
        type: 'eui',
        src: integration.euiIconName,
      });
    } else if (integration.icon) {
      icons.push({
        type: 'svg',
        src: core.http.basePath.prepend(
          `/plugins/${PLUGIN_ID}/assets/language_clients/${integration.icon}`
        ),
      });
    }

    registry.registerCustomIntegration({
      id: `language_client.${integration.id}`,
      title: integration.title,
      description: integration.description,
      type: 'ui_link',
      shipper: 'language_clients',
      // Documentation for `main` branches is still published at a `master` URL.
      uiInternalPath: integration.docUrlTemplate.replace(
        '{branch}',
        branch === 'main' ? 'master' : branch
      ),
      isBeta: false,
      icons,
      categories: ['elastic_stack', 'custom', 'language_client'],
    });
  });
}
