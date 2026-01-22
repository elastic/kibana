/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { Space } from '@kbn/spaces-plugin/common';
import type { AIAssistantManagementSelectionConfig } from './config';
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

  const createPlugin = (config: Partial<AIAssistantManagementSelectionConfig> = {}) => {
    const initializerContext = {
      env: {
        packageInfo: {
          buildFlavor: 'classic',
        },
      },
      config: {
        get: jest.fn().mockReturnValue(config),
      },
      logger: {
        get: jest.fn().mockReturnValue({
          error: jest.fn(),
        }),
      },
    } as unknown as PluginInitializerContext;
    return new AIAssistantManagementSelectionPlugin(initializerContext);
  };

  const setupPlugin = (
    plugin: AIAssistantManagementSelectionPlugin,
    options: {
      spaces?: ReturnType<typeof spacesMock.createStart>;
      coreStart?: Partial<{ security: { authc: { getCurrentUser: jest.Mock } } }>;
    } = {}
  ) => {
    const coreSetup = coreMock.createSetup();
    const spaces = options.spaces ?? spacesMock.createStart();
    const coreStart = options.coreStart ?? {
      security: {
        authc: {
          getCurrentUser: jest.fn().mockReturnValue({ username: 'test-user' }),
        },
      },
    };
    coreSetup.getStartServices.mockResolvedValue([coreStart as any, { spaces }, {} as any]);

    const setupDeps = {
      management: {
        sections: {
          getSection: jest.fn(),
        },
      },
    } as any;

    plugin.setup(coreSetup, setupDeps);
    return { coreSetup, spaces };
  };

  const getChatExperienceGetValue = (coreSetup: ReturnType<typeof coreMock.createSetup>) => {
    const registeredSettings = coreSetup.uiSettings.register.mock.calls.find(
      (call) => call[0][PREFERRED_CHAT_EXPERIENCE_SETTING_KEY]
    );
    return registeredSettings![0][PREFERRED_CHAT_EXPERIENCE_SETTING_KEY].getValue;
  };

  describe('stateful', () => {
    it('registers both AI assistant type and chat experience settings', async () => {
      const plugin = createPlugin({
        preferredAIAssistantType: AIAssistantType.Observability,
        preferredChatExperience: AIChatExperience.Classic,
      });
      const { coreSetup } = setupPlugin(plugin);

      expect(coreSetup.uiSettings.register).toHaveBeenCalledTimes(2);

      // First call: AI Assistant Type setting
      expect(coreSetup.uiSettings.register).toHaveBeenNthCalledWith(1, {
        [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...classicSetting,
          value: AIAssistantType.Observability,
        },
      });

      // Second call: Chat Experience setting - should have getValue function
      const chatExperienceSettingDef =
        coreSetup.uiSettings.register.mock.calls[1][0][PREFERRED_CHAT_EXPERIENCE_SETTING_KEY];
      expect(chatExperienceSettingDef).toMatchObject({
        name: chatExperienceSetting.name,
        options: chatExperienceSetting.options,
        type: chatExperienceSetting.type,
      });
      expect(chatExperienceSettingDef.getValue).toBeDefined();
      expect(typeof chatExperienceSettingDef.getValue).toBe('function');
      expect(chatExperienceSettingDef).not.toHaveProperty('value');
    });

    describe('chat experience getValue()', () => {
      it('should return config value when provided', async () => {
        const plugin = createPlugin({ preferredChatExperience: AIChatExperience.Agent });
        const { coreSetup } = setupPlugin(plugin);
        const getValue = getChatExperienceGetValue(coreSetup);

        await expect(getValue!({ request: {} as any })).resolves.toBe(AIChatExperience.Agent);
      });

      it('should return Classic when no request is provided', async () => {
        const plugin = createPlugin();
        const { coreSetup } = setupPlugin(plugin);
        const getValue = getChatExperienceGetValue(coreSetup);

        await expect(getValue!()).resolves.toBe(AIChatExperience.Classic);
      });

      it.each([
        { solution: 'es', expected: AIChatExperience.Agent },
        { solution: 'oblt', expected: AIChatExperience.Classic },
        { solution: 'security', expected: AIChatExperience.Classic },
        { solution: 'classic', expected: AIChatExperience.Classic },
      ])(
        'should return $expected when active space solution is "$solution"',
        async ({ solution, expected }) => {
          const plugin = createPlugin();
          const spaces = spacesMock.createStart();
          const mockSpace: Pick<Space, 'solution'> = { solution: solution as any };
          spaces.spacesService.getActiveSpace.mockResolvedValue(mockSpace as Space);
          const { coreSetup } = setupPlugin(plugin, { spaces });
          const getValue = getChatExperienceGetValue(coreSetup);

          const requestMock = {
            auth: { isAuthenticated: true },
          };
          await expect(getValue!({ request: requestMock as any })).resolves.toBe(expected);
        }
      );

      it('should handle error and fallback to Classic', async () => {
        const plugin = createPlugin();
        const spaces = spacesMock.createStart();
        spaces.spacesService.getActiveSpace.mockRejectedValue(new Error('something went wrong'));
        const { coreSetup } = setupPlugin(plugin, { spaces });
        const getValue = getChatExperienceGetValue(coreSetup);

        const requestMock = {
          auth: { isAuthenticated: true },
        };
        await expect(getValue!({ request: requestMock as any })).resolves.toBe(
          AIChatExperience.Classic
        );
      });
    });
  });
});
