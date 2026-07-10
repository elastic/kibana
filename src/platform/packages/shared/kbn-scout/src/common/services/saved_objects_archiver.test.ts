/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsClient } from '../../types';
import { loadSavedObjectsArchive, unloadSavedObjectsArchive } from './saved_objects_archiver';

const toRepoRelative = (fixture: string) =>
  Path.relative(REPO_ROOT, Path.resolve(__dirname, '__fixtures__', fixture));

const SAVED_OBJECTS_ARCHIVE = toRepoRelative('saved_objects_archive');
const PLAIN_DATA_ARCHIVE = toRepoRelative('plain_data_archive');
const ARCHIVE_WITH_INDEX_DEFINITION = toRepoRelative('archive_with_index_definition');

const log = new ToolingLog();

const createEsClientMock = () => {
  const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
  const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0, total: 0 });
  return { client: { bulk, deleteByQuery } as unknown as EsClient, bulk, deleteByQuery };
};

describe('loadSavedObjectsArchive', () => {
  it('purges the archive types (preserving `space` by default) and bulk-indexes the docs', async () => {
    const { client, bulk, deleteByQuery } = createEsClientMock();

    await loadSavedObjectsArchive(client, log, SAVED_OBJECTS_ARCHIVE);

    expect(deleteByQuery).toHaveBeenCalledTimes(1);
    const deleteRequest = deleteByQuery.mock.calls[0][0];
    expect(deleteRequest.query.terms.type.sort()).toEqual(['index-pattern', 'legacy-url-alias']);
    expect(deleteRequest.index).toEqual(expect.arrayContaining(['.kibana']));

    expect(bulk).toHaveBeenCalledTimes(1);
    const { operations, refresh } = bulk.mock.calls[0][0];
    expect(refresh).toBe(true);
    // one action + one source entry per archive doc, in archive order
    expect(operations).toHaveLength(6);
    expect(operations[0]).toEqual({ index: { _index: '.kibana', _id: 'space:space_1' } });
    expect(operations[1].type).toBe('space');
    expect(operations[2]).toEqual({
      index: { _index: '.kibana', _id: 'space_1:index-pattern:pattern_1' },
    });
    expect(operations[4]).toEqual({
      index: { _index: '.kibana', _id: 'legacy-url-alias:space_1:index-pattern:pattern_1' },
    });
  });

  it('honors a custom preservedTypes list', async () => {
    const { client, deleteByQuery } = createEsClientMock();

    await loadSavedObjectsArchive(client, log, SAVED_OBJECTS_ARCHIVE, { preservedTypes: [] });

    const deleteRequest = deleteByQuery.mock.calls[0][0];
    expect(deleteRequest.query.terms.type.sort()).toEqual([
      'index-pattern',
      'legacy-url-alias',
      'space',
    ]);
  });

  it('throws when the bulk request reports per-document failures', async () => {
    const { client, bulk } = createEsClientMock();
    bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          index: {
            _index: '.kibana',
            _id: 'space:space_1',
            status: 400,
            error: { type: 'mapper_parsing_exception' },
          },
        },
      ],
    });

    await expect(loadSavedObjectsArchive(client, log, SAVED_OBJECTS_ARCHIVE)).rejects.toThrow(
      /Failed to load saved objects archive .*mapper_parsing_exception/s
    );
  });

  it('rejects archives with documents outside the saved object indices', async () => {
    const { client, bulk, deleteByQuery } = createEsClientMock();

    await expect(loadSavedObjectsArchive(client, log, PLAIN_DATA_ARCHIVE)).rejects.toThrow(
      /\[my-data-index\], which is not a Kibana saved object index/
    );
    expect(deleteByQuery).not.toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
  });

  it('rejects archives containing index definitions', async () => {
    const { client } = createEsClientMock();

    await expect(
      loadSavedObjectsArchive(client, log, ARCHIVE_WITH_INDEX_DEFINITION)
    ).rejects.toThrow(/contains a \[index\] record/);
  });

  it('rejects archives that cannot be resolved', async () => {
    const { client } = createEsClientMock();

    await expect(loadSavedObjectsArchive(client, log, 'not/a/real/archive')).rejects.toThrow(
      /could not be resolved/
    );
  });
});

describe('unloadSavedObjectsArchive', () => {
  it('bulk-deletes every archive doc', async () => {
    const { client, bulk, deleteByQuery } = createEsClientMock();

    await unloadSavedObjectsArchive(client, log, SAVED_OBJECTS_ARCHIVE);

    expect(deleteByQuery).not.toHaveBeenCalled();
    expect(bulk).toHaveBeenCalledTimes(1);
    const { operations } = bulk.mock.calls[0][0];
    expect(operations).toEqual([
      { delete: { _index: '.kibana', _id: 'space:space_1' } },
      { delete: { _index: '.kibana', _id: 'space_1:index-pattern:pattern_1' } },
      { delete: { _index: '.kibana', _id: 'legacy-url-alias:space_1:index-pattern:pattern_1' } },
    ]);
  });

  it('ignores missing documents but throws on other failures', async () => {
    const { client, bulk } = createEsClientMock();
    bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          delete: {
            _index: '.kibana',
            _id: 'space:space_1',
            status: 404,
            error: { type: 'not_found' },
          },
        },
      ],
    });

    await expect(
      unloadSavedObjectsArchive(client, log, SAVED_OBJECTS_ARCHIVE)
    ).resolves.toBeUndefined();

    bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          delete: {
            _index: '.kibana',
            _id: 'space:space_1',
            status: 403,
            error: { type: 'security_exception' },
          },
        },
      ],
    });

    await expect(unloadSavedObjectsArchive(client, log, SAVED_OBJECTS_ARCHIVE)).rejects.toThrow(
      /Failed to unload saved objects archive .*security_exception/s
    );
  });
});
