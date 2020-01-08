/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { KbnClient } from '@kbn/dev-utils';

import {
  saveAction,
  loadAction,
  unloadAction,
  rebuildAllAction,
  emptyKibanaIndexAction,
  editAction,
} from './actions';

export class EsArchiver {
  constructor({ client, dataDir, log, kibanaUrl }) {
    this.client = client;
    this.dataDir = dataDir;
    this.log = log;
    this.kbnClient = new KbnClient(log, [kibanaUrl]);
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
  async save(name, indices, { raw = false } = {}) {
    return await saveAction({
      name,
      indices,
      raw,
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
      kbnClient: this.kbnClient,
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
      client: this.client,
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
  async edit(prefix, handler) {
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
  async loadIfNeeded(name) {
    return await this.load(name, { skipExisting: true });
  }

  /**
   *  Delete any Kibana indices, and initialize the Kibana index as Kibana would do
   *  on startup.
   *
   *  @return Promise
   */
  async emptyKibanaIndex() {
    await emptyKibanaIndexAction({
      client: this.client,
      log: this.log,
      kbnClient: this.kbnClient,
    });
  }
}
