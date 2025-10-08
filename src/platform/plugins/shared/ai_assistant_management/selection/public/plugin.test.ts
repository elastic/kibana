/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import type { ManagementSetup } from '@kbn/management-plugin/public';
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
        get$: jest.fn(() =>
          new BehaviorSubject<AIAssistantType>(AIAssistantType.Default).asObservable()
        ),
        isDefault: jest.fn(() => false),
      },
      application: {
        capabilities: {
          management: {
            ai: {
              aiAssistantManagementSelection: true,
              securityAiAssistantManagement: true,
              observabilityAiAssistantManagement: false,
            },
          },
        },
      },
    } as unknown as CoreStart;

    const result = plugin.start(coreStart, {} as any);

    const collected: any[] = [];
    const subscription = result.aiAssistantType$.subscribe((value) => {
      collected.push(value);
    });
    subscription.unsubscribe();

    expect(coreStart.uiSettings.get).toHaveBeenCalledWith(
      PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
      AIAssistantType.Default
    );
    expect(collected).toEqual([AIAssistantType.Default]);
  });

  describe('Licensing', () => {
    const createManagementMock = () => {
      const apps: any[] = [];
      const aiSection = {
        registerApp: (args: any) => {
          const app = {
            id: args.id,
            enabled: true,
            enable() {
              this.enabled = true;
            },
            disable() {
              this.enabled = false;
            },
          };
          apps.push(app);
          return app;
        },
        getApps: () => apps,
      };

      return {
        sections: { section: { ai: aiSection } },
      } as unknown as ManagementSetup;
    };

    const createCoreSetupMock = (): CoreSetup<any, any> =>
      ({
        getStartServices: jest.fn().mockResolvedValue([{} as any, {} as any, {} as any]),
      } as any);

    const rank: Record<string, number> = {
      basic: 10,
      standard: 20,
      gold: 30,
      platinum: 40,
      enterprise: 50,
      trial: 60,
    };

    const makeLicense = (type: keyof typeof rank) => ({
      type,
      hasAtLeast: (minimum: keyof typeof rank) => rank[type] >= rank[minimum],
    });

    const applicationCapabilities = {
      capabilities: {
        management: {
          ai: {
            aiAssistantManagementSelection: true,
            securityAiAssistantManagement: true,
            observabilityAiAssistantManagement: false,
          },
        },
      },
    };

    it('is disabled by default and only enabled for enterprise license', async () => {
      const plugin = new AIAssistantManagementPlugin({
        config: { get: jest.fn() },
        env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
      } as unknown as PluginInitializerContext);

      const management = createManagementMock();
      const coreSetup = createCoreSetupMock();

      plugin.setup(coreSetup, { management });

      // After setup, app is registered and disabled by default
      const app = (management.sections.section.ai as any).getApps()[0];
      expect(app).toBeDefined();
      expect(app.enabled).toBe(false);

      // Start with non-enterprise license (e.g., gold)
      const license$ = new BehaviorSubject<any>(makeLicense('gold'));
      plugin.start(
        {
          uiSettings: {
            get: jest.fn(() => AIAssistantType.Default),
            get$: jest.fn(() =>
              new BehaviorSubject<AIAssistantType>(AIAssistantType.Default).asObservable()
            ),
            isDefault: jest.fn(() => false),
          },
          application: applicationCapabilities,
        } as any,
        {
          licensing: { license$ } as any,
        }
      );
      expect(app.enabled).toBe(false);

      // Switch to enterprise license
      license$.next(makeLicense('enterprise'));
      expect(app.enabled).toBe(true);

      // Back to non-enterprise
      license$.next(makeLicense('standard'));
      expect(app.enabled).toBe(false);
    });

    it('remains disabled for platinum license', async () => {
      const plugin = new AIAssistantManagementPlugin({
        config: { get: jest.fn() },
        env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
      } as unknown as PluginInitializerContext);

      const management = createManagementMock();
      const coreSetup = createCoreSetupMock();

      plugin.setup(coreSetup, { management });

      const app = (management.sections.section.ai as any).getApps()[0];
      expect(app).toBeDefined();
      expect(app.enabled).toBe(false);

      // Start with a platinum license
      const license$ = new BehaviorSubject<any>(makeLicense('platinum'));
      plugin.start(
        {
          uiSettings: {
            get: jest.fn(() => AIAssistantType.Default),
            get$: jest.fn(() =>
              new BehaviorSubject<AIAssistantType>(AIAssistantType.Default).asObservable()
            ),
            isDefault: jest.fn(() => false),
          },
          application: applicationCapabilities,
        } as any,
        {
          licensing: { license$ } as any,
        }
      );

      expect(app.enabled).toBe(false);
    });

    it('remains disabled for enterprise license when aiAssistantManagementSelection capability is false', async () => {
      const plugin = new AIAssistantManagementPlugin({
        config: { get: jest.fn() },
        env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
      } as unknown as PluginInitializerContext);

      const management = createManagementMock();
      const coreSetup = createCoreSetupMock();

      plugin.setup(coreSetup, { management });

      const app = (management.sections.section.ai as any).getApps()[0];
      expect(app).toBeDefined();
      expect(app.enabled).toBe(false);

      // Start with non-enterprise, then move to enterprise; aiAssistantManagementSelection capability stays false
      const license$ = new BehaviorSubject<any>(makeLicense('gold'));
      plugin.start(
        {
          uiSettings: {
            get: jest.fn(() => AIAssistantType.Default),
            get$: jest.fn(() =>
              new BehaviorSubject<AIAssistantType>(AIAssistantType.Default).asObservable()
            ),
            isDefault: jest.fn(() => false),
          },
          application: {
            capabilities: {
              management: {
                ai: {
                  aiAssistantManagementSelection: false,
                  securityAiAssistantManagement: true,
                  observabilityAiAssistantManagement: true,
                },
              },
            },
          },
        } as any,
        {
          licensing: { license$ } as any,
        }
      );
      expect(app.enabled).toBe(false);

      // Upgrade to enterprise; still should remain disabled because capability is false
      license$.next(makeLicense('enterprise'));
      expect(app.enabled).toBe(false);
    });
  });
});
