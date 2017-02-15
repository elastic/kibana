import { cloneDeep } from 'lodash';

export function createStats(name, log) {
  const indices = {};

  const info = (msg, ...args) => log.info(`[${name}] ${msg}`, ...args);
  const debug = (msg, ...args) => log.debug(`[${name}] ${msg}`, ...args);

  class Stats {
    get(index) {
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
    }

    skipping(index) {
      this.get(index).skipped = true;
      info('Skipping restore for existing index %j', index);
    }

    deleting(index) {
      this.get(index).deleted = true;
      info('Deleting existing index %j', index);
    }

    creating(index, meta) {
      this.get(index).created = true;
      info('Creating index %j', index);
      Object.keys(meta || {}).forEach(name => {
        debug('%j %s %j', index, name, meta[name]);
      });
    }

    archiving(index, meta) {
      this.get(index).archived = true;
      info('Archiving %j', index);
      Object.keys(meta || {}).forEach(name => {
        debug('%j %s %j', index, name, meta[name]);
      });
    }

    indexingDoc(index) {
      this.get(index).docs.indexed += 1;
    }

    archivingDoc(index, meta) {
      this.get(index).docs.archived += 1;
    }

    taggedConfigDoc(index, version) {
      this.get(index).configDocs.tagged += 1;
      info('Tagged Kibana config doc with version %s to be automatically upgraded on reload', version);
    }

    upgradedConfigDoc(index, version) {
      this.get(index).configDocs.upgraded += 1;
      info('Setting Kibana config doc to version %s', version);
    }

    upToDateConfigDoc(index, version) {
      this.get(index).configDocs.upToDate += 1;
      debug('Kibana config doc in %s already has version %s', index, version);
    }

    toJSON() {
      return cloneDeep(indices);
    }

    forEachIndex(fn) {
      Object.keys(indices).forEach(index => {
        fn(index, indices[index]);
      });
    }
  }

  return new Stats();
}
