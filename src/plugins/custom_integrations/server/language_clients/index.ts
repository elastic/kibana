/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from 'kibana/server';
import { CustomIntegrationRegistry } from '../custom_integration_registry';
import { PLUGIN_ID } from '../../common';

interface LanguageIntegration {
  id: string;
  title: string;
  icon: string;
  description: string;
  docUrl: string;
}

export const integrations: LanguageIntegration[] = [
  {
    id: 'javascript',
    title: i18n.translate('custom_integrations.languageclients.JavascriptTitle', {
      defaultMessage: 'Elasticsearch JavaScript Client',
    }),
    icon: 'nodejs.svg',
    description: i18n.translate('custom_integrations.languageclients.JavascriptDescription', {
      defaultMessage:
        'Start building your custom application on top of Elasticsearch with the official Node.js client.',
    }),
    docUrl:
      'https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/introduction.html',
  },
];

export function registerLanguageClients(core: CoreSetup, registry: CustomIntegrationRegistry) {
  integrations.forEach((integration) => {
    registry.registerCustomIntegration({
      id: `language_client.${integration.id}`,
      title: integration.title,
      description: integration.description,
      type: 'ui_link',
      shipper: 'language_clients',
      uiInternalPath: integration.docUrl,
      isBeta: false,
      icons: [
        {
          type: 'svg',
          src: core.http.basePath.prepend(
            `/plugins/${PLUGIN_ID}/assets/language_clients/${integration.icon}`
          ),
        },
      ],
      categories: ['elastic_stack', 'custom', 'language_client'],
    });
  });
}
