/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  convertSecurityApiMock,
  getDefaultSecurityImplementationMock,
} from './security_service.test.mocks';

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import { SecurityService } from './security_service';
import { WorkloadTypeRegistry } from './workload_type_registry';
import { convertSecurityApi as actualConvertSecurityApi } from './utils/convert_security_api';
import { configServiceMock } from '@kbn/config-mocks';
import { getFips } from 'crypto';

const createStubInternalContract = (): CoreSecurityDelegateContract => {
  return Symbol('stubContract') as unknown as CoreSecurityDelegateContract;
};

describe('SecurityService', function () {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let configService: ReturnType<typeof configServiceMock.create>;
  let service: SecurityService;

  beforeEach(() => {
    const mockConfig = {
      xpack: {
        security: {
          fipsMode: {
            enabled: !!getFips(),
          },
        },
      },
    };
    configService = configServiceMock.create({ getConfig$: mockConfig });
    coreContext = mockCoreContext.create({ configService });
    service = new SecurityService(coreContext);

    convertSecurityApiMock.mockReset();
    getDefaultSecurityImplementationMock.mockReset();
  });

  describe('#setup', () => {
    describe('#registerSecurityDelegate', () => {
      it('throws if called more than once', () => {
        const { registerSecurityDelegate } = service.setup();

        const contract = createStubInternalContract();
        registerSecurityDelegate(contract);

        expect(() => registerSecurityDelegate(contract)).toThrowErrorMatchingInlineSnapshot(
          `"security API can only be registered once"`
        );
      });
    });

    describe('#fips', () => {
      describe('#isEnabled', () => {
        it('should return boolean', () => {
          const { fips } = service.setup();
          if (getFips() === 0) {
            expect(fips.isEnabled()).toBe(false);
          } else {
            expect(fips.isEnabled()).toBe(true);
          }
        });
      });
    });

    describe('#acquireFakeRequestEnricher', () => {
      it('returns a function on the first call', () => {
        const setup = service.setup();

        const enricher = setup.acquireFakeRequestEnricher();

        expect(typeof enricher).toBe('function');
      });

      it('throws if called more than once (one-shot, reserved for Task Manager)', () => {
        const setup = service.setup();

        setup.acquireFakeRequestEnricher();

        expect(() => setup.acquireFakeRequestEnricher()).toThrow(
          /can only be called once and is reserved for Task Manager/
        );
      });

      it('throws when the returned enricher is invoked before the security delegate is registered', () => {
        const setup = service.setup();
        const enricher = setup.acquireFakeRequestEnricher();

        const request = { isFakeRequest: true } as any;
        expect(() => enricher(request, { profileId: 'u_test_profile_123' })).toThrow(
          /Cannot enrich a fake request before the security delegate has been registered/
        );
      });

      it('delegates to the registered security delegate when invoked', () => {
        const setup = service.setup();
        const enricher = setup.acquireFakeRequestEnricher();

        const fakeRequestEnricher = jest.fn();
        setup.registerSecurityDelegate({
          fakeRequestEnricher,
        } as unknown as CoreSecurityDelegateContract);

        const request = { isFakeRequest: true } as any;
        enricher(request, { profileId: 'u_test_profile_123', username: 'jdoe' });

        expect(fakeRequestEnricher).toHaveBeenCalledTimes(1);
        expect(fakeRequestEnricher).toHaveBeenCalledWith(request, {
          profileId: 'u_test_profile_123',
          username: 'jdoe',
        });
      });
    });

    describe('#serviceAccounts.registerWorkloadType', () => {
      it('records the workload type for the plugin', () => {
        const setup = service.setup();

        expect(() =>
          setup.serviceAccounts.registerWorkloadType('alerting', {
            type: 'rule',
            name: 'Alerting rule',
          })
        ).not.toThrow();
      });

      it('rejects an invalid type', () => {
        expect(() =>
          service.setup().serviceAccounts.registerWorkloadType('alerting', {
            type: 'Alerting.Rule',
            name: 'Alerting rule',
          })
        ).toThrow(/only lowercase letters, digits and underscores are allowed/);
      });

      it('rejects a duplicate type from the same plugin', () => {
        const setup = service.setup();
        setup.serviceAccounts.registerWorkloadType('alerting', { type: 'rule', name: 'Rule' });

        expect(() =>
          setup.serviceAccounts.registerWorkloadType('alerting', { type: 'rule', name: 'Rule' })
        ).toThrow(
          /Service account workload type \[rule\] has already been registered by plugin \[alerting\]/
        );
      });

      it('lets different plugins register the same type', () => {
        const setup = service.setup();
        setup.serviceAccounts.registerWorkloadType('alerting', { type: 'rule', name: 'Rule' });

        expect(() =>
          setup.serviceAccounts.registerWorkloadType('workflows', { type: 'rule', name: 'Rule' })
        ).not.toThrow();
      });

      it('hands the registrations to the start contract', async () => {
        convertSecurityApiMock.mockImplementation(actualConvertSecurityApi);
        const setup = service.setup();
        setup.serviceAccounts.registerWorkloadType('alerting', { type: 'rule', name: 'Rule' });

        const serviceAccounts = {
          isEnabled: jest.fn(),
          create: jest.fn(),
          getWorkloadBinding: jest.fn().mockResolvedValue(null),
          bindWorkload: jest.fn(),
          unbindWorkload: jest.fn(),
          withScopedRequestForWorkload: jest.fn(),
        };
        setup.registerSecurityDelegate({
          authc: { apiKeys: {} },
          serviceAccounts,
        } as unknown as CoreSecurityDelegateContract);

        const start = service.start();
        const params = { workloadType: 'rule', workloadId: 'rule-id', spaceId: 'default' };

        await start.serviceAccounts.asScopedToPlugin('alerting').getWorkloadBinding(params);
        expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith('alerting', params);

        await expect(
          start.serviceAccounts.asScopedToPlugin('workflows').getWorkloadBinding(params)
        ).rejects.toThrow(
          /Plugin \[workflows\] has not registered service account workload type \[rule\]/
        );
      });
    });

    describe('#uiam', () => {
      it('should be set to `null` if UIAM is not configured ', () => {
        expect(service.setup().uiam).toBeNull();
      });

      it('should be set to `null` if UIAM is not enabled', () => {
        service = new SecurityService(
          mockCoreContext.create({
            configService: configServiceMock.create({
              getConfig$: {
                xpack: {
                  security: {
                    fipsMode: { enabled: !!getFips() },
                    uiam: { enabled: false, sharedSecret: 'some-secret' },
                  },
                },
              },
            }),
          })
        );
        expect(service.setup().uiam).toBeNull();
      });

      it('should attach the configured shared secret if UIAM is enabled', () => {
        service = new SecurityService(
          mockCoreContext.create({
            configService: configServiceMock.create({
              getConfig$: {
                xpack: {
                  security: {
                    fipsMode: { enabled: !!getFips() },
                    uiam: { enabled: true, sharedSecret: 'some-secret' },
                  },
                },
              },
            }),
          })
        );
        expect(
          service.setup().uiam?.getElasticsearchClientAuthentication({
            credentialSource: 'internal',
            credential: new HTTPAuthorizationHeader('ApiKey', 'essu_internal_key'),
          })
        ).toBe('some-secret');
      });
    });
  });

  describe('#start', () => {
    it('logs a warning if the security API was not registered', () => {
      service.setup();
      service.start();

      expect(loggerMock.collect(coreContext.logger as MockedLogger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "Security API was not registered, using default implementation",
          ],
        ]
      `);
    });

    it('calls convertSecurityApi with the registered API', () => {
      const { registerSecurityDelegate } = service.setup();

      const contract = createStubInternalContract();
      registerSecurityDelegate(contract);

      service.start();

      expect(convertSecurityApiMock).toHaveBeenCalledTimes(1);
      expect(convertSecurityApiMock).toHaveBeenCalledWith(
        contract,
        expect.any(WorkloadTypeRegistry)
      );
    });

    it('calls convertSecurityApi with the default implementation when no API was registered', () => {
      const contract = createStubInternalContract();
      getDefaultSecurityImplementationMock.mockReturnValue(contract);

      service.setup();
      service.start();

      expect(convertSecurityApiMock).toHaveBeenCalledTimes(1);
      expect(convertSecurityApiMock).toHaveBeenCalledWith(
        contract,
        expect.any(WorkloadTypeRegistry)
      );
    });

    it('returns the result of convertSecurityApi as contract', () => {
      const convertedContract = { stub: true };
      convertSecurityApiMock.mockReturnValue(convertedContract);

      service.setup();
      const startContract = service.start();

      expect(startContract).toEqual(convertedContract);
    });
  });
});
