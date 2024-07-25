/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  convertSecurityApiMock,
  getDefaultSecurityImplementationMock,
} from './security_service.test.mocks';

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import { SecurityService } from './security_service';

const createStubInternalContract = (): CoreSecurityDelegateContract => {
  return Symbol('stubContract') as unknown as CoreSecurityDelegateContract;
};

describe('SecurityService', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let service: SecurityService;

  beforeEach(() => {
    coreContext = mockCoreContext.create();
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

          expect(fips.isEnabled()).toBe(false);
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
