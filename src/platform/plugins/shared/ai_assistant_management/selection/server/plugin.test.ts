/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup } from '@kbn/core/server';
import type { AIAssistantManagementSelectionPluginServerDependenciesSetup } from './types';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_CHAT_EXPERIENCE_SETTING_KEY,
} from '../common/ui_setting_keys';
import { classicSetting } from './src/settings/classic_setting';
import { chatExperienceSetting } from './src/settings/chat_experience_setting';
import { AIAssistantManagementSelectionPlugin } from './plugin';

describe('plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stateful', () => {
    it('uses the correct setting keys to register both AI assistant type and chat experience settings', async () => {
      const initializerContext = {
        env: {
          packageInfo: {
            buildFlavor: 'classic',
          },
        },
        config: {
          get: jest.fn().mockReturnValue({
            preferredAIAssistantType: AIAssistantType.Observability,
            preferredChatExperience: AIChatExperience.Classic,
          }),
        },
      } as unknown as PluginInitializerContext;
      const aiAssistantManagementSelectionPlugin = new AIAssistantManagementSelectionPlugin(
        initializerContext
      );

      const coreSetup = {
        uiSettings: {
          register: jest.fn(),
        },
        capabilities: {
          registerProvider: jest.fn(),
        },
      } as unknown as CoreSetup;

      const setupDeps = {
        management: {
          sections: {
            getSection: jest.fn(),
          },
        },
      } as unknown as AIAssistantManagementSelectionPluginServerDependenciesSetup;

      aiAssistantManagementSelectionPlugin.setup(coreSetup, setupDeps);

      expect(coreSetup.uiSettings.register).toHaveBeenCalledTimes(2);

      // First call: AI Assistant Type setting
      expect(coreSetup.uiSettings.register).toHaveBeenNthCalledWith(1, {
        [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...classicSetting,
          value: AIAssistantType.Observability,
        },
      });

      // Second call: Chat Experience setting
      expect(coreSetup.uiSettings.register).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          [PREFERRED_CHAT_EXPERIENCE_SETTING_KEY]: expect.objectContaining({
            name: chatExperienceSetting.name,
            description: chatExperienceSetting.description,
            type: chatExperienceSetting.type,
            options: chatExperienceSetting.options,
            optionLabels: chatExperienceSetting.optionLabels,
            value: AIChatExperience.Classic,
          }),
        })
      );
    });
  });
});
