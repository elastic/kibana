/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { setNotifications } from '../../services';
import { SearchResponseWarning } from '../types';
import { filterWarnings, handleWarnings } from './handle_warnings';
import * as extract from './extract_warnings';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});
jest.mock('./extract_warnings', () => ({
  extractWarnings: jest.fn(() => []),
}));

const theme = themeServiceMock.createStartContract();

describe('Filtering and showing warnings', () => {
  const notifications = notificationServiceMock.createStartContract();

  describe('handleWarnings', () => {
    const request = { body: {} };
    beforeEach(() => {
      setNotifications(notifications);
      (notifications.toasts.addWarning as jest.Mock).mockReset();
      jest.resetAllMocks();
    });

    test('should notify if timed out', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [
        {
          message: 'request timed out',
          type: 'timeout_warning',
        },
      ]);
      const response = { rawResponse: { timed_out: true } } as unknown as estypes.SearchResponse;
      handleWarnings(request, response, theme);
      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'request timed out' });
    });

    test('should notify if shards failed for unknown type/reason', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [
        {
          message: 'shards failed',
          type: 'something_no_one_has_ever_seen',
        },
      ]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings(request, response, theme);
      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'shards failed' });
    });

    test('should add mount point for shard modal failure button if warning.text is provided', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [
        {
          message: 'shards failed',
          type: 'something_no_one_has_ever_seen',
          text: 'It was the best of times, it was the worst of times.',
        },
      ]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings(request, response, theme);
      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({
        title: 'shards failed',
        text: expect.any(Function),
      });
    });

    test('should notify once if the response contains multiple failures', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [
        {
          message: 'shards failed',
          type: 'something_no_one_has_ever_seen',
        },
        {
          message: 'more shards failed',
          type: 'another_thing_no_one_has_ever_seen',
        },
      ]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings(request, response, theme);
      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'shards failed' });
    });

    test('should notify once if the response contains some unfiltered failures', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [
        {
          message: 'shards failed',
          type: 'something_no_one_has_ever_seen',
        },
        {
          message: 'more shards failed',
          type: 'another_thing_no_one_has_ever_seen',
        },
      ]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;

      const callback = (warning: SearchResponseWarning) =>
        warning.type !== 'another_thing_no_one_has_ever_seen';
      handleWarnings(request, response, theme, callback);

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'more shards failed' });
    });

    test('should not notify if the response contains no unfiltered failures', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [
        {
          message: 'shards failed',
          type: 'something_no_one_has_ever_seen',
        },
        {
          message: 'more shards failed',
          type: 'another_thing_no_one_has_ever_seen',
        },
      ]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;

      const callback = () => true;
      handleWarnings(request, response, theme, callback);

      expect(notifications.toasts.addWarning).toBeCalledTimes(0);
    });
  });

  describe('filterWarnings', () => {
    const callback = jest.fn();
    const warnings = [
      { message: 'request timed out', type: 'timeout_warning' },
      { message: 'shards failed', type: 'something_no_one_has_ever_seen' },
    ];

    beforeEach(() => {
      callback.mockImplementation(() => {
        throw new Error('not initialized');
      });
    });

    it('filters out all', () => {
      callback.mockImplementation(() => true);
      expect(filterWarnings(warnings, callback)).toEqual([]);
    });

    it('filters out some', () => {
      callback.mockImplementation(
        (warning: SearchResponseWarning) => warning.type !== 'something_no_one_has_ever_seen'
      );
      expect(filterWarnings(warnings, callback)).toEqual([
        { message: 'shards failed', type: 'something_no_one_has_ever_seen' },
      ]);
    });

    it('filters out none', () => {
      callback.mockImplementation(() => false);
      expect(filterWarnings(warnings, callback)).toEqual([
        { message: 'request timed out', type: 'timeout_warning' },
        { message: 'shards failed', type: 'something_no_one_has_ever_seen' },
      ]);
    });
  });
});
