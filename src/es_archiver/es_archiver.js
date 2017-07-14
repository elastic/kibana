import {
  saveAction,
  loadAction,
  unloadAction,
  rebuildAllAction,
} from './actions';

export class EsArchiver {
  constructor({ client, dataDir, log }) {
    this.client = client;
    this.dataDir = dataDir;
    this.log = log;
  }

  /**
   *  Extract data and mappings from an elasticsearch index and store
   *  it in the dataDir so it can be used later to recreate the index.
   *
   *  @param {String} name - the name of this archive, used to determine filename
   *  @param {String|Array<String>} indices - the indices to archive
   *  @return Promise<Stats>
   */
  async save(name, indices) {
    return await saveAction({
      name,
      indices,
      client: this.client,
      dataDir: this.dataDir,
      log: this.log,
    });
  }

  /**
   *  Load an index from an archive
   *
   *  @param {String} name - the name of the archive to load
   *  @param {Object} options
   *  @property {Boolean} options.skipExisting - should existing indices
   *                                           be ignored or overwritten
   *  @return Promise<Stats>
   */
  async load(name, options = {}) {
    const { skipExisting } = options;

    return await loadAction({
      name,
      skipExisting: !!skipExisting,
      client: this.client,
      dataDir: this.dataDir,
      log: this.log,
    });
  }

  /**
   *  Remove the indexes in elasticsearch that have data in an archive.
   *
   *  @param {String} name
   *  @return Promise<Stats>
   */
  async unload(name) {
    return await unloadAction({
      name,
      client: this.client,
      dataDir: this.dataDir,
      log: this.log,
    });
  }

  /**
   *  Parse and reformat all of the archives. This is primarily helpful
   *  for working on the esArchiver.
   *
   *  @return Promise<Stats>
   */
  async rebuildAll() {
    return rebuildAllAction({
      client: this.client,
      dataDir: this.dataDir,
      log: this.log
    });
  }

  /**
   *  Just like load, but skips any existing index
   *
   *  @param {String} name
   *  @return Promise<Stats>
   */
  async loadIfNeeded(name) {
    return this.load(name, { skipExisting: true });
  }
}
