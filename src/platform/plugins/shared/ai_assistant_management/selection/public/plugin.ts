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
import { BehaviorSubject, Observable, switchMap } from 'rxjs';
import type { BuildFlavor } from '@kbn/config';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
} from '../common/ui_setting_keys';

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

export interface StartDependencies {
  spaces: SpacesPluginStart;
}

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
  private readonly config: {
    serverlessUiSettingsKey?: string;
  };

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
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
      keywords: ['ai'],
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

  public start(coreStart: CoreStart, plugins: StartDependencies) {
    const aiAssistantType$ = this.getAiAssistantType$(coreStart, plugins);

    return {
      aiAssistantType$,
    };
  }

  private getAiAssistantType$(
    coreStart: CoreStart,
    plugins: StartDependencies
  ): Observable<AIAssistantType> {
    if (this.buildFlavor === 'serverless') {
      if (!this.config.serverlessUiSettingsKey) {
        throw new Error(
          i18n.translate('aiAssistantManagementSelection.serverlessUiSettingsKeyMissingError', {
            defaultMessage: 'The serverless UI settings key is not configured.',
          })
        );
      }
      const preferredAIAssistantType: AIAssistantType = coreStart.uiSettings.get(
        this.config.serverlessUiSettingsKey
      );

      return new BehaviorSubject(preferredAIAssistantType);
    }

    const space$ = plugins.spaces.getActiveSpace$();

    return space$.pipe(
      switchMap((value) => {
        switch (value.solution) {
          case undefined:
          case 'classic':
            return new BehaviorSubject(
              coreStart.uiSettings.get(PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY)
            );
          case 'oblt':
            return new BehaviorSubject(
              coreStart.uiSettings.get(OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY)
            );
          case 'es':
            return new BehaviorSubject(
              coreStart.uiSettings.get(SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY)
            );
          case 'security':
            return new BehaviorSubject(
              coreStart.uiSettings.get(SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY)
            );
          case 'chat':
          default:
            return new BehaviorSubject(AIAssistantType.Never);
        }
      })
    );
  }
}
