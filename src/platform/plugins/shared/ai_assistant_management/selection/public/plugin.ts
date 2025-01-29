/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { type CoreSetup, Plugin, type CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ServerlessPluginSetup } from '@kbn/serverless/public';
import { BehaviorSubject, Observable } from 'rxjs';
import type { BuildFlavor } from '@kbn/config';
import { AIAssistantType } from '../common/ai_assistant_type';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AIAssistantManagementSelectionPluginPublicSetup {}

export interface AIAssistantManagementSelectionPluginPublicStart {
  aiAssistantType$: Observable<AIAssistantType>;
}

export interface SetupDependencies {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  serverless?: ServerlessPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDependencies {}

export class AIAssistantManagementPlugin
  implements
    Plugin<
      AIAssistantManagementSelectionPluginPublicSetup,
      AIAssistantManagementSelectionPluginPublicStart,
      SetupDependencies,
      StartDependencies
    >
{
  private readonly kibanaBranch: string;
  private readonly buildFlavor: BuildFlavor;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaBranch = this.initializerContext.env.packageInfo.branch;
    this.buildFlavor = this.initializerContext.env.packageInfo.buildFlavor;
  }

  public setup(
    core: CoreSetup<StartDependencies, AIAssistantManagementSelectionPluginPublicStart>,
    { home, management, serverless }: SetupDependencies
  ): AIAssistantManagementSelectionPluginPublicSetup {
    if (serverless) {
      return {};
    }

    if (home) {
      home.featureCatalogue.register({
        id: 'ai_assistant',
        title: i18n.translate('aiAssistantManagementSelection.app.title', {
          defaultMessage: 'AI Assistants',
        }),
        description: i18n.translate('aiAssistantManagementSelection.app.description', {
          defaultMessage: 'Manage your AI Assistants.',
        }),
        icon: 'sparkles',
        path: '/app/management/kibana/aiAssistantManagementSelection',
        showOnHomePage: false,
        category: 'admin',
      });
    }

    management.sections.section.kibana.registerApp({
      id: 'aiAssistantManagementSelection',
      title: i18n.translate('aiAssistantManagementSelection.managementSectionLabel', {
        defaultMessage: 'AI Assistants',
      }),
      order: 1,
      mount: async (mountParams) => {
        const { mountManagementSection } = await import('./management_section/mount_section');

        return mountManagementSection({
          core,
          mountParams,
          kibanaBranch: this.kibanaBranch,
          buildFlavor: this.buildFlavor,
        });
      },
    });

    return {};
  }

  public start(coreStart: CoreStart) {
    const preferredAIAssistantType: AIAssistantType = coreStart.uiSettings.get(
      PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY
    );

    const aiAssistantType$ = new BehaviorSubject(preferredAIAssistantType);

    return {
      aiAssistantType$: aiAssistantType$.asObservable(),
    };
  }
}
