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
import { extractWarnings } from './extract_warnings';
import { handleWarning } from './handle_warning';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

const theme = themeServiceMock.createStartContract();

describe('handleWarning', () => {
  const notifications = notificationServiceMock.createStartContract();
  const request = { body: {} };
  beforeEach(() => {
    setNotifications(notifications);
    (notifications.toasts.addWarning as jest.Mock).mockReset();
    jest.resetAllMocks();
  });

  test('should notify if timed out', () => {
    const warning: SearchResponseWarning = {
      message: 'request timed out',
      type: 'timeout_warning',
    };
    const response = { rawResponse: { timed_out: true } } as unknown as estypes.SearchResponse;
    handleWarning(warning, request, response, theme);
    expect(notifications.toasts.addWarning).toBeCalledTimes(1);
    expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'request timed out' });
  });

  test('should notify if shards failed for unknown type/reason', () => {
    const warning: SearchResponseWarning = {
      message: 'shards failed',
      type: 'something_no_one_has_ever_seen',
    };
    const response = {
      rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
    } as unknown as estypes.SearchResponse;
    handleWarning(warning, request, response, theme);
    expect(notifications.toasts.addWarning).toBeCalledTimes(1);
    expect(notifications.toasts.addWarning).toBeCalledWith({ title: 'shards failed' });
  });

  test('should add mount point for shard modal failure button if warning.text is provided', () => {
    const warning: SearchResponseWarning = {
      message: 'shards failed',
      type: 'something_no_one_has_ever_seen',
      text: 'It was the best of times, it was the worst of times.',
    };
    const response = {
      rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
    } as unknown as estypes.SearchResponse;
    handleWarning(warning, request, response, theme);
    expect(notifications.toasts.addWarning).toBeCalledTimes(1);
    expect(notifications.toasts.addWarning).toBeCalledWith({
      title: 'shards failed',
      text: expect.any(Function),
    });
  });

  describe('warnings from extractWarnings', () => {
    it('notifies a single time for known type of shard failure', () => {
      const response = {
        took: 25,
        timed_out: false,
        _shards: {
          total: 4,
          successful: 2,
          skipped: 0,
          failed: 2,
          failures: [
            {
              shard: 0,
              index: 'sample-01-rollup',
              node: 'VFTFJxpHSdaoiGxJFLSExQ',
              reason: {
                type: 'illegal_argument_exception',
                reason:
                  'Field [kubernetes.container.memory.available.bytes] of type [aggregate_metric_double] is not supported for aggregation [percentiles]',
              },
            },
          ],
        },
        hits: { total: 18239, max_score: null, hits: [] },
        aggregations: {},
      };
      const warnings = extractWarnings(response);
      warnings.forEach((warning) => {
        handleWarning(warning, request, response, theme);
      });

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({
        title: '{shardsFailed} of {shardsTotal} shards failed',
        text: expect.any(Function),
      });
    });

    it('notifices a single time for unknown type of shard failure', () => {
      const response = {
        took: 25,
        timed_out: false,
        _shards: {
          total: 4,
          successful: 0,
          skipped: 0,
          failed: 4,
        },
        hits: { total: 18239, max_score: null, hits: [] },
        aggregations: {},
      };
      const warnings = extractWarnings(response);
      warnings.forEach((warning) => {
        handleWarning(warning, request, response, theme);
      });

      expect(notifications.toasts.addWarning).toBeCalledTimes(1);
      expect(notifications.toasts.addWarning).toBeCalledWith({
        title: '{shardsFailed} of {shardsTotal} shards failed',
        text: expect.any(Function),
      });
    });
  });
});
