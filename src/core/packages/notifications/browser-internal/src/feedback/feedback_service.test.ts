/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FeedbackService } from './feedback_service';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

describe('FeedbackService', () => {
  describe('#start()', () => {
    it('returns a FeedbackStart contract', () => {
      const service = new FeedbackService();
      const mockSettings = settingsServiceMock.createStartContract();

      const feedbackStart = service.start({ settings: mockSettings });

      expect(feedbackStart).toBeDefined();
      expect(feedbackStart.isEnabled).toBeDefined();
    });
  });

  describe('isEnabled()', () => {
    it.each`
      settingValue | expectedResult
      ${false}     | ${true}
      ${true}      | ${false}
      ${undefined} | ${true}
    `(
      'returns $expectedResult when hideFeedback is $settingValue',
      ({ settingValue, expectedResult }) => {
        const service = new FeedbackService();
        const mockSettings = settingsServiceMock.createStartContract();
        mockSettings.globalClient.get.mockReturnValue(settingValue);

        const feedbackStart = service.start({ settings: mockSettings });

        expect(feedbackStart.isEnabled()).toBe(expectedResult);
        expect(mockSettings.globalClient.get).toHaveBeenCalledWith('hideFeedback', false);
      }
    );
  });
});
