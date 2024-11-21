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

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
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
