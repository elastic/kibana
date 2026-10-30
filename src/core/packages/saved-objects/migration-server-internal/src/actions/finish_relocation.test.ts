/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AliasAction } from './update_aliases';
import { waitGroup, type WaitGroup } from '../kibana_migrator_utils';
import {
  RELOCATION_ALREADY_MIGRATED,
  RELOCATION_STILL_REQUIRED,
  finishRelocationEarly,
  finishRelocationIfPublished,
} from './finish_relocation';

describe('finishRelocationEarly', () => {
  const client = elasticsearchClientMock.createInternalClient();

  beforeEach(() => {
    client.indices.delete.mockReset();
    client.indices.delete.mockResolvedValue({ acknowledged: true });
  });

  it('resolves every relocation wait group and deletes this migrator temp index', async () => {
    const waitGroups = createWaitGroups();

    const result = await finishRelocationEarly({
      client,
      tempIndex: '.kibana_8.19.20_reindex_temp',
      ...waitGroups.groups,
    })();

    expect(result).toEqual(Either.right(RELOCATION_ALREADY_MIGRATED));
    expect(waitGroups.readyToReindex.resolve).toHaveBeenCalledTimes(1);
    expect(waitGroups.doneReindexing.resolve).toHaveBeenCalledTimes(1);
    expect(waitGroups.updateRelocationAliases.resolve).toHaveBeenCalledWith([]);
    expect(client.indices.delete).toHaveBeenCalledWith({
      index: '.kibana_8.19.20_reindex_temp',
      ignore_unavailable: true,
    });
  });

  it('still reports the relocation as migrated when deleting the temp index fails', async () => {
    client.indices.delete.mockRejectedValueOnce(new Error('delete failed'));
    const waitGroups = createWaitGroups();

    const result = await finishRelocationEarly({
      client,
      tempIndex: '.kibana_8.19.20_reindex_temp',
      ...waitGroups.groups,
    })();

    expect(result).toEqual(Either.right(RELOCATION_ALREADY_MIGRATED));
    expect(waitGroups.updateRelocationAliases.resolve).toHaveBeenCalledWith([]);
  });
});

describe('finishRelocationIfPublished', () => {
  const client = elasticsearchClientMock.createInternalClient();

  beforeEach(() => {
    client.indices.get.mockReset();
    client.indices.delete.mockReset();
    client.indices.delete.mockResolvedValue({ acknowledged: true });
  });

  it('releases the wait groups when both aliases already point at the migrated index', async () => {
    client.indices.get.mockResolvedValueOnce({
      '.kibana_8.19.20_001': {
        aliases: {
          '.kibana': {},
          '.kibana_8.19.20': {},
        },
        mappings: {},
        settings: {},
      },
    } as never);
    const waitGroups = createWaitGroups();

    const result = await finishRelocationIfPublished({
      client,
      currentAlias: '.kibana',
      versionAlias: '.kibana_8.19.20',
      tempIndex: '.kibana_8.19.20_reindex_temp',
      ...waitGroups.groups,
    })();

    expect(result).toEqual(Either.right(RELOCATION_ALREADY_MIGRATED));
    expect(waitGroups.readyToReindex.resolve).toHaveBeenCalledTimes(1);
    expect(waitGroups.doneReindexing.resolve).toHaveBeenCalledTimes(1);
    expect(waitGroups.updateRelocationAliases.resolve).toHaveBeenCalledWith([]);
    expect(client.indices.delete).toHaveBeenCalledTimes(1);
  });

  it('leaves the wait groups untouched when the version alias is not published yet', async () => {
    client.indices.get.mockResolvedValueOnce({
      '.kibana_8.0.1_001': {
        aliases: {
          '.kibana': {},
        },
        mappings: {},
        settings: {},
      },
    } as never);
    const waitGroups = createWaitGroups();

    const result = await finishRelocationIfPublished({
      client,
      currentAlias: '.kibana',
      versionAlias: '.kibana_8.19.20',
      tempIndex: '.kibana_8.19.20_reindex_temp',
      ...waitGroups.groups,
    })();

    expect(result).toEqual(Either.right(RELOCATION_STILL_REQUIRED));
    expect(waitGroups.readyToReindex.resolve).not.toHaveBeenCalled();
    expect(waitGroups.doneReindexing.resolve).not.toHaveBeenCalled();
    expect(waitGroups.updateRelocationAliases.resolve).not.toHaveBeenCalled();
    expect(client.indices.delete).not.toHaveBeenCalled();
  });
});

function createWaitGroups() {
  const readyToReindex = waitGroup<void>();
  const doneReindexing = waitGroup<void>();
  const updateRelocationAliases = waitGroup<AliasAction[]>();
  jest.spyOn(readyToReindex, 'resolve');
  jest.spyOn(doneReindexing, 'resolve');
  jest.spyOn(updateRelocationAliases, 'resolve');

  return {
    readyToReindex,
    doneReindexing,
    updateRelocationAliases,
    groups: {
      readyToReindex,
      doneReindexing,
      updateRelocationAliases,
    } as {
      readyToReindex: WaitGroup<void>;
      doneReindexing: WaitGroup<void>;
      updateRelocationAliases: WaitGroup<AliasAction[]>;
    },
  };
}
