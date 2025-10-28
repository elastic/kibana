/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import type { Plugin, PluginInitializerContext } from '@kbn/core/public';
import { type CoreSetup, type CoreStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementApp } from '@kbn/management-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ServerlessPluginSetup } from '@kbn/serverless/public';

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { BuildFlavor } from '@kbn/config';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { AIAssistantType } from '../common/ai_assistant_type';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';
import { NavControlInitiator } from './components/navigation_control/lazy_nav_control';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AIAssistantManagementSelectionPluginPublicSetup {}

export interface AIAssistantManagementSelectionPluginPublicStart {
  aiAssistantType$: Observable<AIAssistantType>;
  openChat$: Observable<{ assistant: AIAssistantType }>;
  completeOpenChat(): void;
}

export interface SetupDependencies {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  serverless?: ServerlessPluginSetup;
}

export interface StartDependencies {
  licensing: LicensingPluginStart;
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
  private registeredAiAssistantManagementSelectionApp?: ManagementApp;
  private licensingSubscription?: Subscription;
  private aiAssistantTypeSubscription?: Subscription;

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
        path: '/app/management/ai/aiAssistantManagementSelection',
        showOnHomePage: false,
        category: 'admin',
      });
    }

    this.registeredAiAssistantManagementSelectionApp = management.sections.section.ai.registerApp({
      id: 'aiAssistantManagementSelection',
      title: i18n.translate('aiAssistantManagementSelection.managementSectionLabel', {
        defaultMessage: 'AI Assistants',
      }),
      order: 2,
      keywords: ['ai'],
      mount: async (mountParams) => {
        const { mountManagementSection } = await import('./management_section/mount_section');
        const securityAIAssistantEnabled = !!management?.sections.section.ai
          .getAppsEnabled()
          .find((app) => app.id === 'securityAiAssistantManagement' && app.enabled);

        return mountManagementSection({
          core,
          mountParams,
          kibanaBranch: this.kibanaBranch,
          buildFlavor: this.buildFlavor,
          securityAIAssistantEnabled,
        });
      },
    });

    // Default to disabled until license check runs in start()
    this.registeredAiAssistantManagementSelectionApp.disable();

    return {};
  }

  public start(coreStart: CoreStart, startDeps: StartDependencies) {
    const { licensing } = startDeps;
    const preferredAIAssistantType: AIAssistantType = coreStart.uiSettings.get(
      PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
      AIAssistantType.Default
    );

    const aiAssistantType$ = new BehaviorSubject<AIAssistantType>(preferredAIAssistantType);
    // Keep aiAssistantType$ in sync with UI setting without page reload
    this.aiAssistantTypeSubscription = coreStart.uiSettings
      .get$<AIAssistantType>(PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY)
      .subscribe((nextValue) => {
        aiAssistantType$.next(nextValue);
      });
    const openChatSubject = new BehaviorSubject<{ assistant: AIAssistantType }>({
      assistant: AIAssistantType.Default,
    });
    const completeOpenChat = () => {
      openChatSubject.next({ assistant: AIAssistantType.Default });
    };

    const isAiAssistantManagementSelectionEnabled =
      coreStart.application.capabilities.management.ai.aiAssistantManagementSelection;

    // Toggle visibility based on license at runtime
    if (licensing) {
      this.licensingSubscription = licensing.license$.subscribe((license) => {
        const isEnterprise = license?.hasAtLeast('enterprise');
        if (isEnterprise && isAiAssistantManagementSelectionEnabled) {
          this.registeredAiAssistantManagementSelectionApp?.enable();
        } else {
          this.registeredAiAssistantManagementSelectionApp?.disable();
        }
      });
    }

    const isObservabilityAIAssistantEnabled =
      coreStart.application.capabilities.observabilityAIAssistant?.show === true;
    const isSecurityAIAssistantEnabled =
      coreStart.application.capabilities.securitySolutionAssistant?.['ai-assistant'] === true;

    const isUntouchedUiSetting = coreStart.uiSettings.isDefault(
      PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY
    );

    if (
      isUntouchedUiSetting &&
      (isObservabilityAIAssistantEnabled || isSecurityAIAssistantEnabled)
    ) {
      coreStart.chrome.navControls.registerRight({
        mount: (element) => {
          ReactDOM.render(
            <NavControlInitiator
              isObservabilityAIAssistantEnabled={isObservabilityAIAssistantEnabled}
              isSecurityAIAssistantEnabled={isSecurityAIAssistantEnabled}
              coreStart={coreStart}
              triggerOpenChat={(event: { assistant: AIAssistantType }) =>
                openChatSubject.next(event)
              }
              spaces={startDeps.spaces}
            />,
            element,
            () => {}
          );

          return () => {
            ReactDOM.unmountComponentAtNode(element);
          };
        },
        // before the user profile
        order: 1001,
      });
    }

    return {
      aiAssistantType$: aiAssistantType$.asObservable(),
      openChat$: openChatSubject.asObservable(),
      completeOpenChat,
    };
  }

  public stop() {
    this.licensingSubscription?.unsubscribe();
    this.aiAssistantTypeSubscription?.unsubscribe();
  }
}
