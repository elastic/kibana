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
import { SearchRequest } from '../../../common';

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
const warnings: SearchResponseWarning[] = [
  {
    type: 'timed_out' as const,
    message: 'Something timed out!',
    reason: undefined,
  },
  {
    type: 'shard_failure' as const,
    message: 'Some shards failed!',
    text: 'test text',
    reason: { type: 'illegal_argument_exception', reason: 'Illegal argument! Go to jail!' },
  },
  {
    type: 'shard_failure' as const,
    message: 'Some shards failed!',
    reason: { type: 'generic_shard_failure' },
  },
];

const sessionId = 'abcd';

describe('Filtering and showing warnings', () => {
  const notifications = notificationServiceMock.createStartContract();
  jest.useFakeTimers();

  describe('handleWarnings', () => {
    const request = { body: {} };
    beforeEach(() => {
      jest.resetAllMocks();
      jest.advanceTimersByTime(30000);
      setNotifications(notifications);
      (notifications.toasts.addWarning as jest.Mock).mockReset();
      (extract.extractWarnings as jest.Mock).mockImplementation(() => warnings);
    });

    test('should notify if timed out', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [warnings[0]]);
      const response = { rawResponse: { timed_out: true } } as unknown as estypes.SearchResponse;
      handleWarnings({ request, response, theme });
      // test debounce, addWarning should only be called once
      handleWarnings({ request, response, theme });

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'Something timed out!' });

      // test debounce, call addWarning again due to sessionId
      handleWarnings({ request, response, theme, sessionId });
      expect(notifications.toasts.addWarning).toBeCalledTimes(2);
    });

    test('should notify if shards failed for unknown type/reason', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [warnings[2]]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings({ request, response, theme });
      // test debounce, addWarning should only be called once
      handleWarnings({ request, response, theme });

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'Some shards failed!' });

      // test debounce, call addWarning again due to sessionId
      handleWarnings({ request, response, theme, sessionId });
      expect(notifications.toasts.addWarning).toBeCalledTimes(2);
    });

    test('should add mount point for shard modal failure button if warning.text is provided', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [warnings[1]]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings({ request, response, theme });
      // test debounce, addWarning should only be called once
      handleWarnings({ request, response, theme });

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({
        title: 'Some shards failed!',
        text: expect.any(Function),
      });

      // test debounce, call addWarning again due to sessionId
      handleWarnings({ request, response, theme, sessionId });
      expect(notifications.toasts.addWarning).toBeCalledTimes(2);
    });

    test('should notify once if the response contains multiple failures', () => {
      (extract.extractWarnings as jest.Mock).mockImplementation(() => [warnings[1], warnings[2]]);
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings({ request, response, theme });

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({
        title: 'Some shards failed!',
        text: expect.any(Function),
      });
    });

    test('should notify once if the response contains some unfiltered failures', () => {
      const callback = (warning: SearchResponseWarning) =>
        warning.reason?.type !== 'generic_shard_failure';
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings({ request, response, theme, callback });

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'Some shards failed!' });
    });

    test('should not notify if the response contains no unfiltered failures', () => {
      const callback = () => true;
      const response = {
        rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
      } as unknown as estypes.SearchResponse;
      handleWarnings({ request, response, theme, callback });

      expect(notifications.toasts.addWarning).toBeCalledTimes(0);
    });
  });

  describe('filterWarnings', () => {
    const callback = jest.fn();
    const request = {} as SearchRequest;
    const response = {} as estypes.SearchResponse;

    beforeEach(() => {
      callback.mockImplementation(() => {
        throw new Error('not initialized');
      });
    });

    it('filters out all', () => {
      callback.mockImplementation(() => true);
      expect(filterWarnings(warnings, callback, request, response, 'id')).toEqual([]);
    });

    it('filters out some', () => {
      callback.mockImplementation(
        (warning: SearchResponseWarning) => warning.reason?.type !== 'generic_shard_failure'
      );
      expect(filterWarnings(warnings, callback, request, response, 'id')).toEqual([warnings[2]]);
    });

    it('filters out none', () => {
      callback.mockImplementation(() => false);
      expect(filterWarnings(warnings, callback, request, response, 'id')).toEqual(warnings);
    });
  });
});
