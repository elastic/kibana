/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginStart {}

export interface SetupDependencies {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
}

export interface StartDependencies {
  serverless?: ServerlessPluginStart;
  spaces?: SpacesPluginStart;
}

export class AiAssistantManagementObservabilityPlugin
  implements
    Plugin<
      AiAssistantManagementObservabilityPluginSetup,
      AiAssistantManagementObservabilityPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  public setup(
    core: CoreSetup<StartDependencies, AiAssistantManagementObservabilityPluginStart>,
    { home, management }: SetupDependencies
  ): AiAssistantManagementObservabilityPluginSetup {
    if (home) {
      home.featureCatalogue.register({
        id: 'ai_assistant_observability',
        title: i18n.translate('aiAssistantManagementObservability.app.title', {
          defaultMessage: 'AI Assistant for Observability',
        }),
        description: i18n.translate('aiAssistantManagementObservability.app.description', {
          defaultMessage: 'Manage your AI Assistant for Observability.',
        }),
        icon: 'sparkles',
        path: '/app/management/kibana/ai-assistant/observability',
        showOnHomePage: false,
        category: 'admin',
      });
    }

    const kibanaSection = management.sections.section.kibana;

    kibanaSection.registerApp({
      id: 'aiAssistantManagementObservability',
      title: '', // Keep empty to hide from the side navigation
      order: 1,
      mount: async (mountParams) => {
        const { mountManagementSection } = await import('./app');

        return mountManagementSection({
          core,
          mountParams,
        });
      },
    });

    return {};
  }

  public start() {
    return {};
  }
}
