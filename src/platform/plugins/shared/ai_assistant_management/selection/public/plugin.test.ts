/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { AIAssistantManagementPlugin } from './plugin';
import { AIAssistantType } from '../common/ai_assistant_type';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';

describe('AI Assistant Management Selection Plugin', () => {
  it('uses the correct setting key to get the correct value from uiSettings', async () => {
    const plugin = new AIAssistantManagementPlugin({
      config: {
        get: jest.fn(),
      },
      env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
    } as unknown as PluginInitializerContext);

    const coreStart = {
      uiSettings: {
        get: jest.fn((key: string) => {
          if (key === PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY) {
            return AIAssistantType.Default;
          }
        }),
      },
    } as unknown as CoreStart;

    const result = plugin.start(coreStart);

    const collected: any[] = [];
    const subscription = result.aiAssistantType$.subscribe((value) => {
      collected.push(value);
    });
    subscription.unsubscribe();

    const allCalls = (coreStart.uiSettings.get as jest.Mock).mock.calls;
    expect(allCalls).toEqual([['aiAssistant:preferredAIAssistantType']]);
    expect(collected).toEqual([AIAssistantType.Default]);
  });
});
