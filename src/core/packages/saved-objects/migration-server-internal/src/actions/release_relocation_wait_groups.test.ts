/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AliasAction } from './update_aliases';
import { createWaitGroupMap } from '../kibana_migrator_utils';
import { releaseRelocationWaitGroups } from './release_relocation_wait_groups';

describe('releaseRelocationWaitGroups', () => {
  const client = elasticsearchClientMock.createInternalClient();
  const indices = ['.kibana', '.kibana_task_manager'];
  const tempIndex = '.kibana_8.19.20_reindex_temp';

  beforeEach(() => {
    client.indices.delete.mockReset();
    client.indices.delete.mockResolvedValue({ acknowledged: true });
  });

  const createWaitGroups = () => ({
    readyToReindex: createWaitGroupMap<void>(indices),
    doneReindexing: createWaitGroupMap<void>(indices),
    updateRelocationAliases: createWaitGroupMap<AliasAction[]>(indices),
  });

  const release = (waitGroups: ReturnType<typeof createWaitGroups>) =>
    releaseRelocationWaitGroups({
      client,
      tempIndex,
      readyToReindex: waitGroups.readyToReindex['.kibana'],
      doneReindexing: waitGroups.doneReindexing['.kibana'],
      updateRelocationAliases: waitGroups.updateRelocationAliases['.kibana'],
    })();

  it('unblocks sibling migrators waiting on any relocation barrier', async () => {
    const waitGroups = createWaitGroups();
    const siblingActions: AliasAction[] = [
      { add: { index: '.kibana_task_manager_8.19.20_001', alias: '.kibana_task_manager' } },
    ];

    await expect(release(waitGroups)).resolves.toEqual(
      Either.right('relocation_wait_groups_released')
    );

    waitGroups.readyToReindex['.kibana_task_manager'].resolve();
    waitGroups.doneReindexing['.kibana_task_manager'].resolve();
    waitGroups.updateRelocationAliases['.kibana_task_manager'].resolve(siblingActions);

    await expect(waitGroups.readyToReindex['.kibana_task_manager'].promise).resolves.toHaveLength(
      2
    );
    await expect(waitGroups.doneReindexing['.kibana_task_manager'].promise).resolves.toHaveLength(
      2
    );
    // the released migrator contributes no alias actions to the sibling's update
    await expect(
      waitGroups.updateRelocationAliases['.kibana_task_manager'].promise.then((data) => data.flat())
    ).resolves.toEqual(siblingActions);
  });

  it('deletes the temp index this migrator may have created', async () => {
    await release(createWaitGroups());

    expect(client.indices.delete).toHaveBeenCalledWith({
      index: tempIndex,
      ignore_unavailable: true,
    });
  });

  it('still releases the wait groups when deleting the temp index fails', async () => {
    client.indices.delete.mockRejectedValueOnce(new Error('delete failed'));

    await expect(release(createWaitGroups())).resolves.toEqual(
      Either.right('relocation_wait_groups_released')
    );
  });
});
