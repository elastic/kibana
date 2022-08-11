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
import { CustomIntegrationIcon, IntegrationCategory, PLUGIN_ID } from '../../common';

interface ExternalIntegration {
  id: string;
  title: string;
  icon?: string;
  euiIconName?: string;
  description: string;
  docUrlTemplate: string;
  categories: IntegrationCategory[];
}

export const integrations: ExternalIntegration[] = [
  {
    id: 'esf',
    title: i18n.translate('customIntegrations.placeholders.EsfTitle', {
      defaultMessage: 'AWS Serverless Application Repository',
    }),
    icon: 'logo_esf.svg',
    description: i18n.translate('customIntegrations.placeholders.EsfDescription', {
      defaultMessage:
        'Collect logs using AWS Lambda application available in AWS Serverless Application Repository.',
    }),
    docUrlTemplate: `https://serverlessrepo.aws.amazon.com/applications/eu-central-1/267093732750/elastic-serverless-forwarder`,
    categories: ['aws', 'custom'],
  },
];

export function registerExternalIntegrations(
  core: CoreSetup,
  registry: CustomIntegrationRegistry,
  branch: string
) {
  integrations.forEach((integration: ExternalIntegration) => {
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
          `/plugins/${PLUGIN_ID}/assets/placeholders/${integration.icon}`
        ),
      });
    }

    registry.registerCustomIntegration({
      uiInternalPath: '',
      id: `placeholder.${integration.id}`,
      title: integration.title,
      description: integration.description,
      type: 'ui_link',
      shipper: 'placeholders',
      uiExternalLink: integration.docUrlTemplate,
      isBeta: false,
      icons,
      categories: integration.categories,
    });
  });
}
