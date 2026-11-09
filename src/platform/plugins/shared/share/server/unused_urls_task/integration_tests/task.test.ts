/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createRootWithCorePlugins,
  createTestServers,
} from '@kbn/core-test-helpers-kbn-server';
import type { ShortUrlSavedObjectAttributes } from '../../url_service/short_urls/storage/saved_object_short_url_storage';
import { SAVED_OBJECT_TYPE } from '../constants';
import { runDeleteUnusedUrlsTask } from '../task';

interface UrlFixture {
  readonly id: string;
  readonly namespace: string;
  readonly accessDate: number;
}

describe('unused URLs task integration', () => {
  let esServer: TestElasticsearchUtils;
  let root: TestKibanaUtils['root'];
  let internalRepository: ISavedObjectsRepository;
  let logger: Logger;
  let core: ReturnType<typeof coreMock.createSetup>;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
    });

    esServer = await startES();
    root = createRootWithCorePlugins();

    await root.preboot();
    await root.setup();
    const start = await root.start();

    internalRepository = start.savedObjects.createInternalRepository([SAVED_OBJECT_TYPE]);
    logger = root.logger.get('test unused URLs task');
    core = coreMock.createSetup();
    core.getStartServices.mockResolvedValue([
      { ...coreMock.createStart(), savedObjects: start.savedObjects },
      {},
      {},
    ]);
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('deletes at most urlLimit expired URLs per run across namespaces while preserving fresh URLs', async () => {
    const expiredDate = moment().subtract(2, 'years').valueOf();
    const freshDate = moment().valueOf();
    const urlLimit = 2;
    const expiredUrls: UrlFixture[] = [
      { id: 'expired-space-a-1', namespace: 'space-a', accessDate: expiredDate },
      { id: 'expired-space-a-2', namespace: 'space-a', accessDate: expiredDate },
      { id: 'expired-space-a-3', namespace: 'space-a', accessDate: expiredDate },
      { id: 'expired-space-b-1', namespace: 'space-b', accessDate: expiredDate },
      { id: 'expired-space-b-2', namespace: 'space-b', accessDate: expiredDate },
    ];
    const freshUrls: UrlFixture[] = [
      { id: 'fresh-space-a', namespace: 'space-a', accessDate: freshDate },
      { id: 'fresh-space-b', namespace: 'space-b', accessDate: freshDate },
    ];

    const { saved_objects: createdUrls } =
      await internalRepository.bulkCreate<ShortUrlSavedObjectAttributes>(
        [...expiredUrls, ...freshUrls].map(({ id, namespace, accessDate }) => ({
          type: SAVED_OBJECT_TYPE,
          id,
          initialNamespaces: [namespace],
          attributes: {
            slug: id,
            accessCount: 0,
            accessDate,
            createDate: accessDate,
            locatorJSON: '',
            url: '',
          },
          references: [],
        })),
        { refresh: true }
      );
    expect(createdUrls.filter(isSavedObjectErrorResult)).toEqual([]);

    const taskOptions = {
      core,
      urlExpirationDuration: moment.duration(1, 'year'),
      urlLimit,
      logger,
      isEnabled: true,
    };

    // 5 expired URLs with a limit of 2: each run stops at the limit until fewer remain.
    const deletedCounts: number[] = [];
    for (let run = 0; run < 4; run++) {
      const { deletedCount } = await runDeleteUnusedUrlsTask(taskOptions);
      deletedCounts.push(deletedCount);
    }

    expect(deletedCounts).toEqual([2, 2, 1, 0]);

    const { saved_objects: remainingUrls } =
      await internalRepository.find<ShortUrlSavedObjectAttributes>({
        type: SAVED_OBJECT_TYPE,
        namespaces: ['*'],
        perPage: expiredUrls.length + freshUrls.length,
      });

    expect(remainingUrls.map(({ id }) => id).sort()).toEqual(freshUrls.map(({ id }) => id).sort());
  });
});
