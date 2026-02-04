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
import { BehaviorSubject, combineLatest } from 'rxjs';
import type { BuildFlavor } from '@kbn/config';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_CHAT_EXPERIENCE_SETTING_KEY,
} from '../common/ui_setting_keys';
import { NavControlInitiator } from './components/navigation_control/lazy_nav_control';
import type { AIExperienceSelection } from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AIAssistantManagementSelectionPluginPublicSetup {}

export interface AIAssistantManagementSelectionPluginPublicStart {
  aiAssistantType$: Observable<AIAssistantType>;
  openChat$: Observable<AIExperienceSelection>;
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
  private readonly isServerless: boolean;
  private registeredAiAssistantManagementSelectionApp?: ManagementApp;
  private managementAppVisibilitySubscription?: Subscription;
  private aiAssistantTypeSubscription?: Subscription;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaBranch = this.initializerContext.env.packageInfo.branch;
    this.buildFlavor = this.initializerContext.env.packageInfo.buildFlavor;
    this.isServerless = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
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
        const [coreStart] = await core.getStartServices();

        const hasObservabilityAssistant =
          coreStart.application.capabilities.observabilityAIAssistant?.show === true;
        const hasSecurityAssistant =
          coreStart.application.capabilities.securitySolutionAssistant?.['ai-assistant'] === true;

        // Redirect to specific assistant management if only one is available
        if (hasObservabilityAssistant && !hasSecurityAssistant) {
          coreStart.application.navigateToApp('management', {
            path: 'ai/observabilityAiAssistantManagement',
            replace: true,
          });
          return () => {};
        }

        if (hasSecurityAssistant && !hasObservabilityAssistant) {
          coreStart.application.navigateToApp('management', {
            path: 'ai/securityAiAssistantManagement',
            replace: true,
          });
          return () => {};
        }

        // User has both assistants - show selection page
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
    const preferredAIAssistantType: AIAssistantType = coreStart.settings.client.get(
      PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
      AIAssistantType.Default
    );

    const aiAssistantType$ = new BehaviorSubject<AIAssistantType>(preferredAIAssistantType);

    // Keep aiAssistantType$ in sync with UI setting without page reload
    this.aiAssistantTypeSubscription = coreStart.settings.client
      .get$<AIAssistantType>(PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY, AIAssistantType.Default)
      .subscribe((nextValue) => {
        aiAssistantType$.next(nextValue);
      });

    const openChatSubject = new BehaviorSubject<AIExperienceSelection>(AIAssistantType.Default);
    const completeOpenChat = () => {
      openChatSubject.next(AIAssistantType.Default);
    };

    // Check which assistants the user has access to
    const hasObservabilityAssistant =
      coreStart.application.capabilities.observabilityAIAssistant?.show === true;
    const hasSecurityAssistant =
      coreStart.application.capabilities.securitySolutionAssistant?.['ai-assistant'] === true;
    const hasAnyAssistant = hasObservabilityAssistant || hasSecurityAssistant;

    // Toggle visibility based on license and chat experience at runtime
    if (!this.isServerless && licensing) {
      this.managementAppVisibilitySubscription = combineLatest([
        licensing.license$,
        coreStart.settings.client.get$<AIChatExperience>(PREFERRED_CHAT_EXPERIENCE_SETTING_KEY),
      ]).subscribe(([license, chatExperience]) => {
        const isEnterprise = license?.hasAtLeast('enterprise');

        // Show selection app when user has enterprise license, has assistants, and NOT in Agent mode
        if (isEnterprise && hasAnyAssistant && chatExperience !== AIChatExperience.Agent) {
          this.registeredAiAssistantManagementSelectionApp?.enable();
        } else {
          this.registeredAiAssistantManagementSelectionApp?.disable();
        }
      });
    }

    this.registerNavControl(coreStart, openChatSubject, startDeps.spaces);

    return {
      aiAssistantType$: aiAssistantType$.asObservable(),
      openChat$: openChatSubject.asObservable(),
      completeOpenChat,
    };
  }

  private registerNavControl(
    coreStart: CoreStart,
    openChatSubject: BehaviorSubject<AIExperienceSelection>,
    spaces?: SpacesPluginStart
  ) {
    const isObservabilityAIAssistantEnabled =
      coreStart.application.capabilities.observabilityAIAssistant?.show === true;
    const isSecurityAIAssistantEnabled =
      coreStart.application.capabilities.securitySolutionAssistant?.['ai-assistant'] === true;
    const isAiAgentsEnabled = coreStart.application.capabilities.agentBuilder?.show === true;

    const isUntouchedUiSetting = coreStart.settings.client.isDefault(
      PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY
    );

    if (
      !this.isServerless &&
      isUntouchedUiSetting &&
      (isObservabilityAIAssistantEnabled || isSecurityAIAssistantEnabled || isAiAgentsEnabled)
    ) {
      coreStart.chrome.navControls.registerRight({
        mount: (element) => {
          ReactDOM.render(
            coreStart.rendering.addContext(
              <NavControlInitiator
                isObservabilityAIAssistantEnabled={isObservabilityAIAssistantEnabled}
                isSecurityAIAssistantEnabled={isSecurityAIAssistantEnabled}
                coreStart={coreStart}
                triggerOpenChat={(selection: AIExperienceSelection) =>
                  openChatSubject.next(selection)
                }
                spaces={spaces}
              />
            ),
            element
          );

          return () => {
            ReactDOM.unmountComponentAtNode(element);
          };
        },
        // before the user profile
        order: 1001,
      });
    }
  }

  public stop() {
    this.managementAppVisibilitySubscription?.unsubscribe();
    this.aiAssistantTypeSubscription?.unsubscribe();
  }
}
