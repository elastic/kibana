/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest, RequestHandlerContext } from 'src/core/server';

import { License } from './license';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import type { LicenseCheckState } from '../../../../../x-pack/plugins/licensing/common/types';
/* eslint-enable @kbn/eslint/no-restricted-paths */

describe('license_pre_routing_factory', () => {
  describe('#reportingFeaturePreRoutingFactory', () => {
    const pluginName = 'testPlugin';
    const currentLicenseType = 'currentLicenseType';

    const testRoute = ({ licenseState }: { licenseState: LicenseCheckState }) => {
      const license = new License();
      const logger = {
        warn: jest.fn(),
      };

      const licensingMock = {
        license$: {
          subscribe: (callback: (config: unknown) => {}) =>
            callback({
              type: currentLicenseType,
              check: (): { state: LicenseCheckState } => ({ state: licenseState }),
              getFeature: () => ({}),
            }),
        },
      };

      license.setup({ pluginName, logger });
      license.start({
        pluginId: 'id',
        minimumLicenseType: 'basic',
        licensing: licensingMock,
      });

      const route = jest.fn();
      const guardedRoute = license.guardApiRoute(route);
      const customError = jest.fn();
      guardedRoute({} as RequestHandlerContext, {} as KibanaRequest, { customError });

      return {
        errorResponse:
          customError.mock.calls.length > 0
            ? customError.mock.calls[customError.mock.calls.length - 1][0]
            : undefined,
        logMesssage:
          logger.warn.mock.calls.length > 0
            ? logger.warn.mock.calls[logger.warn.mock.calls.length - 1][0]
            : undefined,
        route,
      };
    };

    describe('valid license', () => {
      it('the original route is called and nothing is logged', () => {
        const { errorResponse, logMesssage, route } = testRoute({ licenseState: 'valid' });

        expect(errorResponse).toBeUndefined();
        expect(logMesssage).toBeUndefined();
        expect(route).toHaveBeenCalled();
      });
    });

    [
      {
        licenseState: 'invalid',
        expectedMessage: `Your ${currentLicenseType} license does not support ${pluginName}. Please upgrade your license.`,
      },
      {
        licenseState: 'expired',
        expectedMessage: `You cannot use ${pluginName} because your ${currentLicenseType} license has expired.`,
      },
      {
        licenseState: 'unavailable',
        expectedMessage: `You cannot use ${pluginName} because license information is not available at this time.`,
      },
    ].forEach(({ licenseState, expectedMessage }) => {
      describe(`${licenseState} license`, () => {
        it('replies with 403 and message and logs the message', () => {
          const { errorResponse, logMesssage, route } = testRoute({ licenseState });

          expect(errorResponse).toEqual({
            body: {
              message: expectedMessage,
            },
            statusCode: 403,
          });

          expect(logMesssage).toBe(expectedMessage);
          expect(route).not.toHaveBeenCalled();
        });
      });
    });
  });
});
