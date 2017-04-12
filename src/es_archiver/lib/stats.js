import { cloneDeep } from 'lodash';

export function createStats(name, log) {
  const info = (msg, ...args) => log.info(`[${name}] ${msg}`, ...args);
  const debug = (msg, ...args) => log.debug(`[${name}] ${msg}`, ...args);

  const indices = {};
  const getOrCreate = index => {
    if (!indices[index]) {
      indices[index] = {
        skipped: false,
        deleted: false,
        created: false,
        archived: false,
        configDocs: {
          upgraded: 0,
          tagged: 0,
          upToDate: 0,
        },
        docs: {
          indexed: 0,
          archived: 0,
        }
      };
    }
    return indices[index];
  };

  class Stats {
    skippedIndex(index) {
      getOrCreate(index).skipped = true;
      info('Skipped restore for existing index %j', index);
    }

    deletedIndex(index) {
      getOrCreate(index).deleted = true;
      info('Deleted existing index %j', index);
    }

    createdIndex(index, metadata) {
      getOrCreate(index).created = true;
      info('Created index %j', index);
      Object.keys(metadata || {}).forEach(name => {
        debug('%j %s %j', index, name, metadata[name]);
      });
    }

    archivedIndex(index, metadata) {
      getOrCreate(index).archived = true;
      info('Archived %j', index);
      Object.keys(metadata || {}).forEach(name => {
        debug('%j %s %j', index, name, metadata[name]);
      });
    }

    indexedDoc(index) {
      getOrCreate(index).docs.indexed += 1;
    }

    archivedDoc(index) {
      getOrCreate(index).docs.archived += 1;
    }

    toJSON() {
      return cloneDeep(indices);
    }

    forEachIndex(fn) {
      const clone = this.toJSON();
      Object.keys(clone).forEach(index => {
        fn(index, clone[index]);
      });
    }
  }

  return new Stats();
}
