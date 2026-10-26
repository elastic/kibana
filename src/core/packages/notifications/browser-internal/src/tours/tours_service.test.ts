/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToursService } from './tours_service';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

describe('ToursService', () => {
  describe('#start()', () => {
    it('returns a ToursStart contract', () => {
      const service = new ToursService();
      const mockSettings = settingsServiceMock.createStartContract();

      const toursStart = service.start({ settings: mockSettings });

      expect(toursStart).toBeDefined();
      expect(toursStart.isEnabled).toBeDefined();
    });
  });

  describe('isEnabled()', () => {
    it.each`
      globalSetting | namespaceSetting | expectedResult | description
      ${false}      | ${false}         | ${true}        | ${'both settings are false'}
      ${false}      | ${true}          | ${false}       | ${'namespace setting is true'}
      ${true}       | ${false}         | ${false}       | ${'global setting is true'}
      ${true}       | ${true}          | ${false}       | ${'both settings are true'}
      ${undefined}  | ${undefined}     | ${true}        | ${'both settings are undefined'}
    `(
      'returns $expectedResult when $description',
      ({ globalSetting, namespaceSetting, expectedResult }) => {
        const service = new ToursService();
        const mockSettings = settingsServiceMock.createStartContract();
        mockSettings.globalClient.get.mockReturnValue(globalSetting);
        mockSettings.client.get.mockReturnValue(namespaceSetting);

        const toursStart = service.start({ settings: mockSettings });

        expect(toursStart.isEnabled()).toBe(expectedResult);
        expect(mockSettings.globalClient.get).toHaveBeenCalledWith('hideAnnouncements', false);
        expect(mockSettings.client.get).toHaveBeenCalledWith('hideAnnouncements', false);
      }
    );
  });
});
