import { resolve, dirname } from 'path';
import { readdir, rename } from 'fs';

import { fromNode } from 'bluebird';
import mkdirp from 'mkdirp';

import {
  createPromiseFromStreams,
  createListStream,
} from '../utils';

import {
  isGzip,
  createReadArchiveStreams,
  createWriteArchiveStreams,
  createUpgradeConfigDocsStream,
  createTagConfigDocsStream,
  createIndexDocRecordsStream,
  createGenerateDocRecordsStream,
  createCreateIndexStream,
  createDeleteIndexStream,
  createFilterRecordsStream,
  createGenerateIndexRecordsStream,
  createStats,
  getArchiveFiles,
  prioritizeMappings
} from './lib';

export class EsArchiver {
  constructor({ client, dir, log, kibanaVersion }) {
    this.client = client;
    this.dir = dir;
    this.log = log;
    this.kibanaVersion = kibanaVersion;
  }

  /**
   *  Extract data and mappings from an elasticsearch index and store
   *  it in the dataDir so it can be used later to recreate the index.
   *
   *  @param {Object} options
   *  @property {String} options.name - the name of this dump, used to determine output
   *                                  filename. Passing the same name to `#load()`
   *                                  will recreate the index as it was
   *  @property {String|Array<String>} options.indices - the indices to dump
   *  @return Promise<Stats>
   */
  async save({ name, indices }) {
    const { client, dir, log, kibanaVersion } = this;

    const outputDir = resolve(dir, name);
    const dataOutputFile = resolve(outputDir, 'data.json.gz');
    const mappingOutputFile = resolve(outputDir, 'mappings.json');
    const stats = createStats(name, log);

    log.info('[%s] Creating archive of %j', name, indices);

    await fromNode(cb => mkdirp(dirname(dataOutputFile), cb));
    const resolvedIndexes = Object.keys(await client.indices.get({
      index: indices,
      feature: ['_settings'],
      filterPath: ['*.settings.index.uuid']
    }));

    await Promise.all([
      // export and save the matching indices to mappings.json
      createPromiseFromStreams([
        createListStream(resolvedIndexes),
        createGenerateIndexRecordsStream(client, stats),
        ...createWriteArchiveStreams(mappingOutputFile),
      ]),

      // export all documents from matching indexes into data.json.gz
      createPromiseFromStreams([
        createListStream(resolvedIndexes),
        createGenerateDocRecordsStream(client, stats),
        createTagConfigDocsStream(kibanaVersion, stats),
        ...createWriteArchiveStreams(dataOutputFile),
      ])
    ]);

    stats.forEachIndex((index, { docs }) => {
      log.info('[%s] Archived %d docs from %j', name, docs.archived, index);
    });

    return stats.toJSON();
  }

  /**
   *  Load data and mappings that were previously dumped using `#save()`.
   *
   *  @param {String} name - the name of the dump to load
   *  @param {Object} options
   *  @property {Boolean} options.skipExisting - should existing indices
   *                                           be ignored or overwritten
   *  @return Promise<Stats>
   */
  async load(options) {
    if (typeof options === 'string') {
      options = { name: options };
    }

    const { name, skipExisting } = options;
    const { client, dir, log, kibanaVersion } = this;
    const inputDir = resolve(dir, name);
    const stats = createStats(name, log);

    const files = prioritizeMappings(await getArchiveFiles(inputDir));
    for (const filename of files) {
      log.info('[%s] Loading %j', name, filename);

      await createPromiseFromStreams([
        ...createReadArchiveStreams(resolve(inputDir, filename)),
        createCreateIndexStream({ client, stats, skipExisting }),
        createUpgradeConfigDocsStream(kibanaVersion, stats),
        createIndexDocRecordsStream(client, stats),
      ]);
    }

    stats.forEachIndex((index, { docs }) => {
      log.info('[%s] Indexed %d docs into %j', name, docs.indexed, index);
    });

    return stats.toJSON();
  }

  async unload(name) {
    const { client, dir, log, kibanaVersion } = this;
    const inputDir = resolve(dir, name);
    const stats = createStats(name, log);

    const files = prioritizeMappings(await getArchiveFiles(inputDir));
    for (const filename of files) {
      log.info('[%s] Unloading indices from %j', name, filename);

      await createPromiseFromStreams([
        ...createReadArchiveStreams(resolve(inputDir, filename)),
        createFilterRecordsStream('index'),
        createDeleteIndexStream({ client, stats })
      ]);
    }

    return stats.toJSON();
  }

  async rebuildAll() {
    const { dir, log } = this;
    const archiveNames = await fromNode(cb => readdir(dir, cb));

    for (const name of archiveNames) {
      const inputDir = resolve(dir, name);
      const files = prioritizeMappings(await getArchiveFiles(inputDir));
      for (const filename of files) {
        log.info('[%s] Rebuilding %j', name, filename);

        const path = resolve(inputDir, filename);
        const tempFile = path + (isGzip(path) ? '.rebuilding.gz' : '.rebuilding');

        await createPromiseFromStreams([
          ...createReadArchiveStreams(path),
          ...createWriteArchiveStreams(tempFile)
        ]);

        await fromNode(cb => rename(tempFile, path, cb));
        log.info('[%s] Rebuilt %j', name, filename);
      }
    }
  }

  /**
   *  Just like load, but skips any existing index
   *
   *  @param {String} name
   *  @return Promise<Stats>
   */
  async loadIfNeeded(name) {
    return this.load({ name, skipExisting: true });
  }
}
