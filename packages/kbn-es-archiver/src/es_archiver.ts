/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import { KbnClient } from '@kbn/test';

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
  baseDir?: string;
  log: ToolingLog;
  kbnClient: KbnClient;
}

export class EsArchiver {
  private readonly client: Client;
  private readonly baseDir: string;
  private readonly log: ToolingLog;
  private readonly kbnClient: KbnClient;

  constructor(options: Options) {
    this.client = options.client;
    this.baseDir = options.baseDir ?? REPO_ROOT;
    this.log = options.log;
    this.kbnClient = options.kbnClient;
  }

  /**
   * Extract data and mappings from an elasticsearch index and store
   * it in the baseDir so it can be used later to recreate the index.
   *
   * @param {String} path - relative path to the archive, resolved relative to this.baseDir which defaults to REPO_ROOT
   * @param {String|Array<String>} indices - the indices to archive
   * @param {Object} options
   * @property {Boolean} options.raw - should the archive be raw (unzipped) or not
   * @property {Boolean} options.keepIndexNames - should the Kibana index name be kept as-is or renamed
   */
  async save(
    path: string,
    indices: string | string[],
    {
      raw = false,
      keepIndexNames = false,
      query,
    }: { raw?: boolean; keepIndexNames?: boolean; query?: Record<string, any> } = {}
  ) {
    return await saveAction({
      outputDir: Path.resolve(this.baseDir, path),
      indices,
      raw,
      keepIndexNames,
      client: this.client,
      log: this.log,
      query,
    });
  }

  /**
   * Load an index from an archive
   *
   * @param {String} path - relative path to the archive to load, resolved relative to this.baseDir which defaults to REPO_ROOT
   * @param {Object} options
   * @property {Boolean} options.skipExisting - should existing indices
   *                                           be ignored or overwritten
   * @property {Boolean} options.useCreate - use a create operation instead of index for documents
   * @property {Boolean} options.docsOnly - load only documents, not indices
   */
  async load(
    path: string,
    {
      skipExisting = false,
      useCreate = false,
      docsOnly = false,
    }: { skipExisting?: boolean; useCreate?: boolean; docsOnly?: boolean } = {}
  ) {
    return await loadAction({
      inputDir: this.findArchive(path),
      skipExisting: !!skipExisting,
      useCreate: !!useCreate,
      docsOnly,
      client: this.client,
      log: this.log,
      kbnClient: this.kbnClient,
    });
  }

  /**
   * Remove the indexes in elasticsearch that have data in an archive.
   *
   * @param {String} path - relative path to the archive to unload, resolved relative to this.baseDir which defaults to REPO_ROOT
   */
  async unload(path: string) {
    return await unloadAction({
      inputDir: this.findArchive(path),
      client: this.client,
      log: this.log,
      kbnClient: this.kbnClient,
    });
  }

  /**
   * Parse and reformat all of the archives. This is primarily helpful
   * for working on the esArchiver.
   *
   * @param {String} dir - relative path to a directory which contains archives, resolved relative to this.baseDir which defaults to REPO_ROOT
   */
  async rebuildAll(dir: string) {
    return await rebuildAllAction({
      dataDir: Path.resolve(this.baseDir, dir),
      log: this.log,
    });
  }

  /**
   * Extract the gzipped files in an archive, then call the handler. When it
   * resolves re-archive the gzipped files.
   *
   * @param {String} path optional prefix to limit archives that are extracted
   * @param {() => Promise<any>} handler
   */
  async edit(path: string, handler: () => Promise<void>) {
    return await editAction({
      path: Path.resolve(this.baseDir, path),
      log: this.log,
      handler,
    });
  }

  /**
   * Just like load, but skips any existing index
   *
   * @param name
   */
  async loadIfNeeded(name: string) {
    return await this.load(name, { skipExisting: true });
  }

  /**
   * Delete any Kibana indices, and initialize the Kibana index as Kibana would do
   * on startup.
   */
  async emptyKibanaIndex() {
    return await emptyKibanaIndexAction({
      client: this.client,
      log: this.log,
      kbnClient: this.kbnClient,
    });
  }

  /**
   * Resolve a path relative to the baseDir
   *
   * @param relativePath
   */
  private findArchive(relativePath: string) {
    const path = Path.resolve(this.baseDir, relativePath);
    let stats;
    try {
      stats = Fs.statSync(path);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `Attempt to reference an esArchive with relative path [${relativePath}] could not be resolved. This path was resolved relative to [${this.baseDir}].`
        );
      }

      throw error;
    }

    if (stats.isDirectory()) {
      return path;
    }

    throw new Error(
      `Attempt to reference an esArchive with relative path [${relativePath}] resolved to a file instead of a directory containing data/mapping files. This path was resolved relative to [${this.baseDir}].`
    );
  }
}
