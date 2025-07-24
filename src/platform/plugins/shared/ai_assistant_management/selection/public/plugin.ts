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
import type { SpacesApi, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';
import type { BuildFlavor } from '@kbn/config';
import { AIAssistantType } from '../common/ai_assistant_type';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';
import { once } from 'lodash';

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
  spaces?: SpacesPluginStart;
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
  private space$ = new Subject<SpacesApi | undefined>();
  private spacesSubscription?: Subscription;

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

    const managementApp = management.sections.section.ai.registerApp({
      id: 'aiAssistantManagementSelection',
      title: i18n.translate('aiAssistantManagementSelection.managementSectionLabel', {
        defaultMessage: 'AI Assistants',
      }),
      order: 2,
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

    // Disable in non-classic spaces; individual AI apps appear in the nav.
    this.spacesSubscription = this.space$
      .pipe(
        filter((spaces): spaces is SpacesApi => spaces !== undefined),
        switchMap((spaces) => spaces.getActiveSpace$())
      )
      .subscribe((space) => {
        const isClassicSpace = space?.solution === 'classic' || space?.solution === undefined;
        if (!isClassicSpace) {
          managementApp.disable();
        }

        if (home && isClassicSpace) {
          once(() =>
            home.featureCatalogue.register({
              id: 'ai_assistant',
              title: i18n.translate('aiAssistantManagementSelection.app.title', {
                defaultMessage: 'AI Assistants',
              }),
              description: i18n.translate('aiAssistantManagementSelection.app.description', {
                defaultMessage: 'Manage your AI Assistants.',
              }),
              icon: 'sparkles',
              path: '/app/management/ai/aiAssistantManagementSelection',
              showOnHomePage: false,
              category: 'admin',
            })
          );
        }
      });

    return {};
  }

  public start(coreStart: CoreStart, { spaces }: StartDependencies) {
    this.space$.next(spaces);
    const preferredAIAssistantType: AIAssistantType = coreStart.uiSettings.get(
      PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY
    );

    const aiAssistantType$ = new BehaviorSubject(preferredAIAssistantType);

    return {
      aiAssistantType$: aiAssistantType$.asObservable(),
    };
  }

  public stop() {
    if (this.spacesSubscription) {
      this.spacesSubscription.unsubscribe();
    }
  }
}
