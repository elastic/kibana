/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog, KbnClient } from '@kbn/dev-utils';

import {
  saveAction,
  loadAction,
  unloadAction,
  rebuildAllAction,
  emptyKibanaIndexAction,
  editAction,
} from './actions';

interface Options {
  client: Client;
  dataDir: string;
  log: ToolingLog;
  kbnClient: KbnClient;
}

export class EsArchiver {
  private readonly client: Client;
  private readonly dataDir: string;
  private readonly log: ToolingLog;
  private readonly kbnClient: KbnClient;

  constructor(options: Options) {
    this.client = options.client;
    this.dataDir = options.dataDir;
    this.log = options.log;
    this.kbnClient = options.kbnClient;
  }

  /**
   *  Extract data and mappings from an elasticsearch index and store
   *  it in the dataDir so it can be used later to recreate the index.
   *
   *  @param {String} name - the name of this archive, used to determine filename
   *  @param {String|Array<String>} indices - the indices to archive
   *  @param {Object} options
   *  @property {Boolean} options.raw - should the archive be raw (unzipped) or not
   *  @return Promise<Stats>
   */
  async save(
    name: string,
    indices: string | string[],
    { raw = false, query }: { raw?: boolean; query?: Record<string, any> } = {}
  ) {
    return await saveAction({
      name,
      indices,
      raw,
      client: this.client,
      dataDir: this.dataDir,
      log: this.log,
      query,
    });
  }

  /**
   *  Load an index from an archive
   *
   *  @param {String} name - the name of the archive to load
   *  @param {Object} options
   *  @property {Boolean} options.skipExisting - should existing indices
   *                                           be ignored or overwritten
   *  @property {Boolean} options.useCreate - use a create operation instead of index for documents
   *  @return Promise<Stats>
   */
  async load(
    name: string,
    {
      skipExisting = false,
      useCreate = false,
    }: { skipExisting?: boolean; useCreate?: boolean } = {}
  ) {
    return await loadAction({
      name,
      skipExisting: !!skipExisting,
      useCreate: !!useCreate,
      client: this.client,
      dataDir: this.dataDir,
      log: this.log,
      kbnClient: this.kbnClient,
    });
  }

  /**
   *  Remove the indexes in elasticsearch that have data in an archive.
   *
   *  @param {String} name
   *  @return Promise<Stats>
   */
  async unload(name: string) {
    return await unloadAction({
      name,
      client: this.client,
      dataDir: this.dataDir,
      log: this.log,
      kbnClient: this.kbnClient,
    });
  }

  /**
   *  Parse and reformat all of the archives. This is primarily helpful
   *  for working on the esArchiver.
   *
   *  @return Promise<Stats>
   */
  async rebuildAll() {
    return await rebuildAllAction({
      dataDir: this.dataDir,
      log: this.log,
    });
  }

  /**
   *  Extract the gzipped files in an archive, then call the handler. When it
   *  resolves re-archive the gzipped files.
   *
   *  @param {String} prefix optional prefix to limit archives that are extracted
   *  @param {() => Promise<any>} handler
   *  @return Promise<void>
   */
  async edit(prefix: string, handler: () => Promise<void>) {
    return await editAction({
      prefix,
      log: this.log,
      dataDir: this.dataDir,
      handler,
    });
  }

  /**
   *  Just like load, but skips any existing index
   *
   *  @param {String} name
   *  @return Promise<Stats>
   */
  async loadIfNeeded(name: string) {
    return await this.load(name, { skipExisting: true });
  }

  /**
   *  Delete any Kibana indices, and initialize the Kibana index as Kibana would do
   *  on startup.
   *
   *  @return Promise
   */
  async emptyKibanaIndex() {
    return await emptyKibanaIndexAction({
      client: this.client,
      log: this.log,
      kbnClient: this.kbnClient,
    });
  }
}
