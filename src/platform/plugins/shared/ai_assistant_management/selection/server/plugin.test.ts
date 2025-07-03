/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext, CoreSetup } from '@kbn/core/server';
import type { AIAssistantManagementSelectionPluginServerDependenciesSetup } from './types';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
} from '../common/ui_setting_keys';
import { classicSetting } from './src/settings/classic_setting';
import { observabilitySolutionSetting } from './src/settings/observability_setting';
import { securitySolutionSetting } from './src/settings/security_setting';
import { searchSolutionSetting } from './src/settings/search_setting';
import { AIAssistantManagementSelectionPlugin } from './plugin';

describe('plugin', () => {
  describe('stateless', () => {
    it('registers correct uiSettings for serverless', () => {
      const initializerContext = {
        env: {
          packageInfo: {
            buildFlavor: 'serverless',
          },
        },
        config: {
          get: jest.fn().mockReturnValue({
            preferredAIAssistantType: AIAssistantType.Observability,
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
        serverless: {
          uiSettings: {
            register: jest.fn(),
          },
        },
      } as unknown as AIAssistantManagementSelectionPluginServerDependenciesSetup;

      aiAssistantManagementSelectionPlugin.setup(coreSetup, setupDeps);

      expect(coreSetup.uiSettings.register).toHaveBeenCalledTimes(3);

      expect(coreSetup.uiSettings.register).toHaveBeenCalledWith({
        [OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...observabilitySolutionSetting,
          value: AIAssistantType.Observability,
        },
      });

      expect(coreSetup.uiSettings.register).toHaveBeenCalledWith({
        [SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...securitySolutionSetting,
          value: AIAssistantType.Security,
        },
      });

      expect(coreSetup.uiSettings.register).toHaveBeenCalledWith({
        [SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...searchSolutionSetting,
          value: AIAssistantType.Observability,
        },
      });
    });
  });

  describe('stateful', () => {
    it('uses the correct setting key to get the correct value from uiSettings', async () => {
      const initializerContext = {
        env: {
          packageInfo: {
            buildFlavor: 'classic',
          },
        },
        config: {
          get: jest.fn().mockReturnValue({
            preferredAIAssistantType: AIAssistantType.Observability,
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
        serverless: {
          uiSettings: {
            register: jest.fn(),
          },
        },
      } as unknown as AIAssistantManagementSelectionPluginServerDependenciesSetup;

      aiAssistantManagementSelectionPlugin.setup(coreSetup, setupDeps);

      expect(coreSetup.uiSettings.register).toHaveBeenCalledTimes(1);
      expect(coreSetup.uiSettings.register).toHaveBeenCalledWith({
        [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...classicSetting,
          value: AIAssistantType.Observability,
        },
      });
    });
  });
});
