/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isRetryableEsClientErrorMock } from './is_scripting_enabled.test.mocks';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { isInlineScriptingEnabled } from './is_scripting_enabled';

describe('isInlineScriptingEnabled', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
  });

  const mockSettingsValue = (settings: estypes.ClusterGetSettingsResponse) => {
    client.cluster.getSettings.mockResolvedValue(settings);
  };

  it('returns `true` if all settings are empty', async () => {
    mockSettingsValue({
      transient: {},
      persistent: {},
      defaults: {},
    });

    expect(await isInlineScriptingEnabled({ client })).toEqual(true);
  });

  it('returns `true` if `defaults.script.allowed_types` is `inline`', async () => {
    mockSettingsValue({
      transient: {},
      persistent: {},
      defaults: {
        'script.allowed_types': ['inline'],
      },
    });

    expect(await isInlineScriptingEnabled({ client })).toEqual(true);
  });

  it('returns `false` if `defaults.script.allowed_types` is `none`', async () => {
    mockSettingsValue({
      transient: {},
      persistent: {},
      defaults: {
        'script.allowed_types': ['none'],
      },
    });

    expect(await isInlineScriptingEnabled({ client })).toEqual(false);
  });

  it('returns `false` if `defaults.script.allowed_types` is `stored`', async () => {
    mockSettingsValue({
      transient: {},
      persistent: {},
      defaults: {
        'script.allowed_types': ['stored'],
      },
    });

    expect(await isInlineScriptingEnabled({ client })).toEqual(false);
  });

  it('respect the persistent->defaults priority', async () => {
    mockSettingsValue({
      transient: {},
      persistent: {
        'script.allowed_types': ['inline'],
      },
      defaults: {
        'script.allowed_types': ['stored'],
      },
    });

    expect(await isInlineScriptingEnabled({ client })).toEqual(true);
  });

  it('respect the transient->persistent priority', async () => {
    mockSettingsValue({
      transient: {
        'script.allowed_types': ['stored'],
      },
      persistent: {
        'script.allowed_types': ['inline'],
      },
      defaults: {},
    });

    expect(await isInlineScriptingEnabled({ client })).toEqual(false);
  });

  describe('resiliency', () => {
    beforeEach(() => {
      isRetryableEsClientErrorMock.mockReset();
    });

    const mockSuccessOnce = () => {
      client.cluster.getSettings.mockResolvedValueOnce({
        transient: {},
        persistent: {},
        defaults: {},
      });
    };
    const mockErrorOnce = () => {
      client.cluster.getSettings.mockResponseImplementationOnce(() => {
        throw Error('ERR CON REFUSED');
      });
    };

    it('retries the ES api call in case of retryable error', async () => {
      isRetryableEsClientErrorMock.mockReturnValue(true);

      mockErrorOnce();
      mockSuccessOnce();

      await expect(isInlineScriptingEnabled({ client, maxRetryDelay: 1 })).resolves.toEqual(true);
      expect(client.cluster.getSettings).toHaveBeenCalledTimes(2);
    });

    it('throws in case of non-retryable error', async () => {
      isRetryableEsClientErrorMock.mockReturnValue(false);

      mockErrorOnce();
      mockSuccessOnce();

      await expect(isInlineScriptingEnabled({ client, maxRetryDelay: 0.1 })).rejects.toThrowError(
        'ERR CON REFUSED'
      );
    });

    it('retries up to `maxRetries` times', async () => {
      isRetryableEsClientErrorMock.mockReturnValue(true);

      mockErrorOnce();
      mockErrorOnce();
      mockErrorOnce();
      mockSuccessOnce();

      await expect(
        isInlineScriptingEnabled({ client, maxRetryDelay: 0.1, maxRetries: 2 })
      ).rejects.toThrowError('ERR CON REFUSED');
      expect(client.cluster.getSettings).toHaveBeenCalledTimes(3);
    });
  });
});
