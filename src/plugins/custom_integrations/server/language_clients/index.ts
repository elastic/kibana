/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { CoreSetup } from '@kbn/core/server';
import { CustomIntegrationRegistry } from '../custom_integration_registry';
import { CustomIntegrationIcon, PLUGIN_ID } from '../../common';

import { languageIntegrations } from '../../common/language_integrations';
import type { LanguageIntegration } from '../../common/language_integrations';

export function registerLanguageClients(
  core: CoreSetup,
  registry: CustomIntegrationRegistry,
  branch: string
) {
  languageIntegrations.forEach((integration: LanguageIntegration) => {
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
      uiInternalPath: integration.exportLanguageUiComponent
        ? integration?.integrationsAppUrl
        : // Documentation for `main` branches is still published at a `master` URL.
          integration.docUrlTemplate.replace('{branch}', branch === 'main' ? 'master' : branch),
      isBeta: false,
      icons,
      categories: ['elastic_stack', 'custom', 'language_client'],
    });
  });
}
