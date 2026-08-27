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

    describe('#serviceAccounts.registerOperation', () => {
      const registerOperation = (type: string) =>
        service.setup().serviceAccounts.registerOperation({ type });

      it('returns a handle for the claimed operation type', () => {
        expect(registerOperation('alerting_rule')).toEqual({
          attach: expect.any(Function),
          detach: expect.any(Function),
          getBinding: expect.any(Function),
          withScopedRequest: expect.any(Function),
        });
      });

      it('accepts lowercase alphanumerics and underscores', () => {
        const setup = service.setup();

        for (const type of ['alerting', 'alerting_rule', 'workflow2', '123', 'a_1_b']) {
          expect(() => setup.serviceAccounts.registerOperation({ type })).not.toThrow();
        }
      });

      it.each([
        ['uppercase letters', 'AlertingRule'],
        ['dashes', 'alerting-rule'],
        ['dots', 'alerting.rule'],
        ['spaces', 'alerting rule'],
        ['colons', 'alerting:rule'],
        ['slashes', 'alerting/rule'],
        ['an empty string', ''],
      ])('rejects %s', (_label, type) => {
        expect(() => registerOperation(type)).toThrow(
          /only lowercase letters, digits and underscores are allowed/
        );
      });

      it('rejects a type longer than 256 characters', () => {
        const setup = service.setup();

        expect(() =>
          setup.serviceAccounts.registerOperation({ type: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() => setup.serviceAccounts.registerOperation({ type: 'b'.repeat(257) })).toThrow(
          /must be at most 256 characters, but got 257/
        );
      });

      it('claims the type, so an operation has exactly one owner', () => {
        const setup = service.setup();
        setup.serviceAccounts.registerOperation({ type: 'alerting_rule' });

        expect(() => setup.serviceAccounts.registerOperation({ type: 'alerting_rule' })).toThrow(
          /Service account operation type \[alerting_rule\] has already been registered/
        );
      });

      it('does not claim a type it rejected', () => {
        const setup = service.setup();

        expect(() => setup.serviceAccounts.registerOperation({ type: 'Nope' })).toThrow();
        expect(() => setup.serviceAccounts.registerOperation({ type: 'nope' })).not.toThrow();
      });

      it('rejects handle calls made before the security delegate is registered', async () => {
        const handle = registerOperation('alerting_rule');

        await expect(handle.getBinding({ workloadType: 'rule', workloadId: 'r' })).rejects.toThrow(
          /Cannot use service account operation \[alerting_rule\] before the security delegate has been registered/
        );
      });

      it('passes its own operation type to the delegate, so a handle cannot reach another', async () => {
        const setup = service.setup();
        const handle = setup.serviceAccounts.registerOperation({ type: 'alerting_rule' });

        const serviceAccounts = {
          getWorkloadBinding: jest.fn().mockResolvedValue(null),
          attachWorkload: jest.fn(),
          detachWorkload: jest.fn(),
          withScopedRequestForWorkload: jest.fn(),
        };
        setup.registerSecurityDelegate({
          serviceAccounts,
        } as unknown as CoreSecurityDelegateContract);

        const params = { workloadType: 'rule', workloadId: 'rule-id' };
        await handle.getBinding(params);

        expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith('alerting_rule', params);
      });

      it('resolves the delegate per call, not at registration time', async () => {
        const setup = service.setup();
        // Handle acquired first: a plugin's setup can run before the security plugin's.
        const handle = setup.serviceAccounts.registerOperation({ type: 'alerting_rule' });

        const attachWorkload = jest.fn().mockResolvedValue({});
        setup.registerSecurityDelegate({
          serviceAccounts: { attachWorkload },
        } as unknown as CoreSecurityDelegateContract);

        const request = {} as any;
        const params = { serviceAccountId: 'sa', workloadType: 'rule', workloadId: 'rule-id' };
        await handle.attach(request, params);

        expect(attachWorkload).toHaveBeenCalledWith('alerting_rule', request, params);
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
      expect(convertSecurityApiMock).toHaveBeenCalledWith(contract);
    });

    it('calls convertSecurityApi with the default implementation when no API was registered', () => {
      const contract = createStubInternalContract();
      getDefaultSecurityImplementationMock.mockReturnValue(contract);

      service.setup();
      service.start();

      expect(convertSecurityApiMock).toHaveBeenCalledTimes(1);
      expect(convertSecurityApiMock).toHaveBeenCalledWith(contract);
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
