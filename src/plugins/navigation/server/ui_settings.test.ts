/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { Space } from '@kbn/spaces-plugin/common';

import { getUiSettings } from './ui_settings';
import { DEFAULT_ROUTES } from '../common/constants';

describe('ui settings', () => {
  const core = coreMock.createSetup();
  const logger = loggingSystemMock.createLogger();

  const getValidationFn = (setting: UiSettingsParams) => (value: any) =>
    setting.schema.validate(value);

  describe('defaultRoute', () => {
    it('should only accept relative urls', () => {
      const uiSettings = getUiSettings(core, logger);
      const validate = getValidationFn(uiSettings.defaultRoute);

      expect(() => validate('/some-url')).not.toThrow();
      expect(() => validate('http://some-url')).toThrowErrorMatchingInlineSnapshot(
        `"Must be a relative URL."`
      );
      expect(() => validate(125)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [string] but got [number]"`
      );
    });

    describe('getValue()', () => {
      it('should return classic when neither "space" nor "request" is provided', async () => {
        const { defaultRoute } = getUiSettings(core, logger);
        await expect(defaultRoute.getValue!()).resolves.toBe(DEFAULT_ROUTES.classic);
      });

      it('should return classic when accessing a non authenticated route', async () => {
        const spaces = spacesMock.createStart();
        const mockSpace: Pick<Space, 'solution'> = { solution: 'es' };
        spaces.spacesService.getActiveSpace.mockResolvedValue(mockSpace as Space);
        core.getStartServices.mockResolvedValue([{} as any, { spaces }, {} as any]);

        const { defaultRoute } = getUiSettings(core, logger);
        const requestMock = {
          auth: { isAuthenticated: false },
        };
        await expect(defaultRoute.getValue!({ request: requestMock as any })).resolves.toBe(
          DEFAULT_ROUTES.classic
        );
      });

      it('should return the route based on the active space', async () => {
        const spaces = spacesMock.createStart();

        for (const solution of ['classic', 'es', 'oblt', 'security'] as const) {
          const mockSpace: Pick<Space, 'solution'> = { solution };
          spaces.spacesService.getActiveSpace.mockResolvedValue(mockSpace as Space);
          core.getStartServices.mockResolvedValue([{} as any, { spaces }, {} as any]);
          const { defaultRoute } = getUiSettings(core, logger);

          const requestMock = {
            auth: { isAuthenticated: true },
          };
          await expect(defaultRoute.getValue!({ request: requestMock as any })).resolves.toBe(
            DEFAULT_ROUTES[solution]
          );
        }
      });

      it('should handle error thrown', async () => {
        const spaces = spacesMock.createStart();

        spaces.spacesService.getActiveSpace.mockRejectedValue(new Error('something went wrong'));
        core.getStartServices.mockResolvedValue([{} as any, { spaces }, {} as any]);
        const { defaultRoute } = getUiSettings(core, logger);

        await expect(defaultRoute.getValue!({ request: {} as any })).resolves.toBe(
          DEFAULT_ROUTES.classic
        );
      });
    });
  });
});
