/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  convertUserProfileAPIMock,
  getDefaultUserProfileImplementationMock,
} from './user_profile_service.test.mocks';

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
import { UserProfileService } from './user_profile_service';

const createStubContract = (): CoreUserProfileDelegateContract => {
  return Symbol('stubContract') as unknown as CoreUserProfileDelegateContract;
};

describe('UserProfileService', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let service: UserProfileService;

  beforeEach(() => {
    coreContext = mockCoreContext.create();
    service = new UserProfileService(coreContext);

    convertUserProfileAPIMock.mockReset();
    getDefaultUserProfileImplementationMock.mockReset();
  });

  describe('#setup', () => {
    describe('#registerUserProfileDelegate', () => {
      it('throws if called more than once', () => {
        const { registerUserProfileDelegate } = service.setup();

        const contract = createStubContract();
        registerUserProfileDelegate(contract);

        expect(() => registerUserProfileDelegate(contract)).toThrowErrorMatchingInlineSnapshot(
          `"userProfile API can only be registered once"`
        );
      });
    });
  });

  describe('#start', () => {
    it('logs a warning if the userProfile API was not registered', () => {
      service.setup();
      service.start();

      expect(loggerMock.collect(coreContext.logger as MockedLogger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "userProfile API was not registered, using default implementation",
          ],
        ]
      `);
    });

    it('calls convertUserProfileAPI with the registered API', () => {
      const { registerUserProfileDelegate } = service.setup();

      const contract = createStubContract();
      registerUserProfileDelegate(contract);

      service.start();

      expect(convertUserProfileAPIMock).toHaveBeenCalledTimes(1);
      expect(convertUserProfileAPIMock).toHaveBeenCalledWith(contract);
    });

    it('calls convertUserProfileAPI with the default implementation when no API was registered', () => {
      const contract = createStubContract();
      getDefaultUserProfileImplementationMock.mockReturnValue(contract);

      service.setup();
      service.start();

      expect(convertUserProfileAPIMock).toHaveBeenCalledTimes(1);
      expect(convertUserProfileAPIMock).toHaveBeenCalledWith(contract);
    });

    it('returns the result of convertUserProfileAPI as contract', () => {
      const convertedContract = { stub: true };
      convertUserProfileAPIMock.mockReturnValue(convertedContract);

      service.setup();
      const startContract = service.start();

      expect(startContract).toEqual(convertedContract);
    });
  });
});
