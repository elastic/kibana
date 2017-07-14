import tmp from 'tmp';
import del from 'del';

import { saveAction } from './save';
import { loadAction } from './load';

export async function reindexAction({ indices, client, log, convertToV6 }) {
  const tmpDir = tmp.dirSync();
  const name = 'reindex';

  try {
    log.info('Saving indices to %j', tmpDir.name);
    await saveAction({
      name,
      indices,
      client,
      dataDir: tmpDir.name,
      log,
    });

    log.info('Loading indices from %j', tmpDir.name);
    await loadAction({
      name,
      convertToV6,
      skipExisting: false,
      client,
      dataDir: tmpDir.name,
      log,
    });
  } finally {
    log.info('Cleaning up %j', tmpDir.name);
    del.sync(tmpDir.name, { force: true });
  }
}
