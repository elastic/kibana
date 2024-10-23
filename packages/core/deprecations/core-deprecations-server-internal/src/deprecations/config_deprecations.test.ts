/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerConfigDeprecationsInfo } from './config_deprecations';
import { mockDeprecationsRegistry, mockDeprecationsFactory } from '../mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';

describe('#registerConfigDeprecationsInfo', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;

  const deprecationsFactory = mockDeprecationsFactory.create();
  const deprecationsRegistry = mockDeprecationsRegistry.create();
  const getDeprecationsContext = mockDeprecationsRegistry.createGetDeprecationsContext();

  beforeEach(() => {
    const configService = configServiceMock.create({
      atPath: { skip_deprecated_settings: ['hello', 'world'] },
    });
    jest.clearAllMocks();
    coreContext = mockCoreContext.create({ configService });
  });

  it('registers config deprecations', async () => {
    coreContext.configService.getHandledDeprecatedConfigs.mockReturnValue([
      [
        'testDomain',
        [
          {
            configPath: 'test',
            level: 'critical',
            message: 'testMessage',
            documentationUrl: 'testDocUrl',
            correctiveActions: {
              manualSteps: [
                'Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.',
                'Using Kibana role-mapping management, change all role-mappings which assign the kibana_user role to the kibana_admin role.',
              ],
            },
          },
        ],
      ],
    ]);

    deprecationsFactory.getRegistry.mockReturnValue(deprecationsRegistry);
    registerConfigDeprecationsInfo({
      deprecationsFactory,
      configService: coreContext.configService,
    });

    expect(coreContext.configService.getHandledDeprecatedConfigs).toBeCalledTimes(1);
    expect(deprecationsFactory.getRegistry).toBeCalledTimes(1);
    expect(deprecationsFactory.getRegistry).toBeCalledWith('testDomain');
    expect(deprecationsRegistry.registerDeprecations).toBeCalledTimes(1);
    const configDeprecations =
      await deprecationsRegistry.registerDeprecations.mock.calls[0][0].getDeprecations(
        getDeprecationsContext
      );
    expect(configDeprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "configPath": "test",
          "correctiveActions": Object {
            "manualSteps": Array [
              "Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.",
              "Using Kibana role-mapping management, change all role-mappings which assign the kibana_user role to the kibana_admin role.",
            ],
          },
          "deprecationType": "config",
          "documentationUrl": "testDocUrl",
          "level": "critical",
          "message": "testMessage",
          "requireRestart": true,
          "title": "testDomain has a deprecated setting",
        },
      ]
    `);
  });

  it('accepts `level` field overrides', async () => {
    coreContext.configService.getHandledDeprecatedConfigs.mockReturnValue([
      [
        'testDomain',
        [
          {
            configPath: 'test',
            message: 'testMessage',
            level: 'warning',
            correctiveActions: {
              manualSteps: ['step a'],
            },
          },
        ],
      ],
    ]);

    deprecationsFactory.getRegistry.mockReturnValue(deprecationsRegistry);
    registerConfigDeprecationsInfo({
      deprecationsFactory,
      configService: coreContext.configService,
    });

    const configDeprecations =
      await deprecationsRegistry.registerDeprecations.mock.calls[0][0].getDeprecations(
        getDeprecationsContext
      );
    expect(configDeprecations[0].level).toBe('warning');
  });
});
