/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { AIAssistantManagementPlugin } from './plugin';

describe('AI Assistant Management Selection Plugin', () => {
  const createPlugin = () =>
    new AIAssistantManagementPlugin(coreMock.createPluginInitializerContext());

  const createManagementSetup = () => {
    const management = managementPluginMock.createSetupContract();
    const app = { enable: jest.fn(), disable: jest.fn() } as any;
    (management.sections.section.kibana.registerApp as jest.Mock).mockReturnValue(app);
    return { management, app };
  };

  const createCoreStart = (capability: boolean) => {
    return {
      application: {
        capabilities: {
          management: {
            kibana: {
              aiAssistantManagementSelection: capability,
            },
          },
        },
      },
      uiSettings: { get: jest.fn().mockReturnValue('default') },
    } as any;
  };

  const makeLicense = (isEnterprise: boolean) => ({
    hasAtLeast: (level: string) => level === 'enterprise' && isEnterprise,
  });

  const createLicensingStart = (hasEnterprise: boolean) => {
    const license$ = new BehaviorSubject<any>(makeLicense(hasEnterprise));
    return { ...licensingMock.createStart(), license$ } as any;
  };

  it('registers the management app on setup and disables it by default', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const { management, app } = createManagementSetup();

    plugin.setup(coreSetup, { management });

    expect(management.sections.section.kibana.registerApp).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'aiAssistantManagementSelection' })
    );
    expect(app.disable).toHaveBeenCalledTimes(1);
  });

  it('enables the app when license is enterprise and capability is true', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const { management, app } = createManagementSetup();

    plugin.setup(coreSetup, { management });

    const coreStart = createCoreStart(true);
    const licensing = createLicensingStart(true);

    plugin.start(coreStart, { licensing });

    expect(app.enable).toHaveBeenCalledTimes(1);
  });

  it('disables the app when license is below enterprise', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const { management, app } = createManagementSetup();

    plugin.setup(coreSetup, { management });

    const coreStart = createCoreStart(true);
    const licensing = createLicensingStart(false);

    plugin.start(coreStart, { licensing });

    // disabled once in setup + once from license check
    expect(app.disable).toHaveBeenCalledTimes(2);
    expect(app.enable).not.toHaveBeenCalled();
  });

  it('keeps the app disabled when capability is false even with enterprise license', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const { management, app } = createManagementSetup();

    plugin.setup(coreSetup, { management });

    const coreStart = createCoreStart(false);
    const licensing = createLicensingStart(true);

    plugin.start(coreStart, { licensing });

    // disabled once in setup + once more because capability gate fails
    expect(app.disable).toHaveBeenCalledTimes(2);
    expect(app.enable).not.toHaveBeenCalled();
  });

  it('disables the app when license downgrades from enterprise to non-enterprise', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const { management, app } = createManagementSetup();

    plugin.setup(coreSetup, { management });

    const coreStart = createCoreStart(true);
    const licensing = createLicensingStart(true); // start as enterprise

    plugin.start(coreStart, { licensing });

    expect(app.enable).toHaveBeenCalledTimes(1);

    // downgrade license to non-enterprise
    licensing.license$.next(makeLicense(false));

    expect(app.disable).toHaveBeenCalledTimes(2); // once in setup, once on downgrade
  });

  it('unsubscribes from license$ on stop', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    const { management } = createManagementSetup();
    plugin.setup(coreSetup, { management });

    const unsubscribe = jest.fn();
    const licensing = {
      ...licensingMock.createStart(),
      license$: { subscribe: jest.fn().mockReturnValue({ unsubscribe }) },
    } as any;

    const coreStart = createCoreStart(true);
    plugin.start(coreStart, { licensing });

    plugin.stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
