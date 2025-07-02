/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { AIAssistantManagementPlugin, StartDependencies } from './plugin';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { Space } from '@kbn/spaces-plugin/public';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
} from '../common/ui_setting_keys';

describe('AI Assistant Management Selection Plugin', () => {
  describe('serverless', () => {
    it('uses serverlessUiSettingsKey to get the correct value from uiSettings', async () => {
      const serverlessUiSettingsKey = 'aiAssistant:preferredAIAssistantType:es';
      const plugin = new AIAssistantManagementPlugin({
        config: {
          get: jest.fn(() => ({
            serverlessUiSettingsKey,
          })),
        },
        env: { packageInfo: { buildFlavor: 'serverless', branch: 'main' } },
      } as unknown as PluginInitializerContext);

      const coreStart = {
        uiSettings: { get: jest.fn(() => AIAssistantType.Observability) },
      } as unknown as CoreStart;
      const plugins = {
        spaces: {
          getActiveSpace$: jest.fn(() => of({} as unknown as Space)),
        },
      } as unknown as StartDependencies;

      const result = plugin.start(coreStart, plugins);

      expect(coreStart.uiSettings.get).toHaveBeenCalledWith(serverlessUiSettingsKey);
      const aiAssistantType = await firstValueFrom(result.aiAssistantType$);
      expect(aiAssistantType).toBe(AIAssistantType.Observability);
    });
  });

  describe('stateful', () => {
    it('uses the correct setting key to get the correct value from uiSettings', async () => {
      const plugin = new AIAssistantManagementPlugin({
        config: {
          get: jest.fn(),
        },
        env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
      } as unknown as PluginInitializerContext);

      const spacesBehaviorSubject = new BehaviorSubject({
        solution: undefined,
      } as unknown as Space);
      const coreStart = {
        uiSettings: {
          get: jest.fn((key: string) => {
            if (key === PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY) {
              return AIAssistantType.Default;
            }
            if (key === SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY) {
              return AIAssistantType.Security;
            }
            if (key === OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY) {
              return AIAssistantType.Observability;
            }
            if (key === SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY) {
              return AIAssistantType.Observability;
            }
          }),
        },
      } as unknown as CoreStart;
      const plugins = {
        spaces: {
          getActiveSpace$: jest.fn(() => spacesBehaviorSubject),
        },
      } as unknown as StartDependencies;

      const result = plugin.start(coreStart, plugins);

      const collected: any[] = [];
      const subscription = result.aiAssistantType$.subscribe((value) => {
        collected.push(value);
      });

      spacesBehaviorSubject.next({ solution: 'classic' } as Space);
      spacesBehaviorSubject.next({ solution: 'es' } as Space);
      spacesBehaviorSubject.next({ solution: 'oblt' } as Space);
      spacesBehaviorSubject.next({ solution: 'security' } as Space);
      subscription.unsubscribe();

      const allCalls = (coreStart.uiSettings.get as jest.Mock).mock.calls;
      expect(allCalls).toEqual([
        ['aiAssistant:preferredAIAssistantType'],
        ['aiAssistant:preferredAIAssistantType'],
        ['aiAssistant:preferredAIAssistantType:es'],
        ['aiAssistant:preferredAIAssistantType:oblt'],
        ['aiAssistant:preferredAIAssistantType:security'],
      ]);
      expect(collected).toEqual([
        AIAssistantType.Default,
        AIAssistantType.Default,
        AIAssistantType.Observability,
        AIAssistantType.Observability,
        AIAssistantType.Security,
      ]);
    });
  });
});
