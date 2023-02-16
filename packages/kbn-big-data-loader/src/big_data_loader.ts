/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import Fs from 'fs';
// import Path from 'path';

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
// import type { Client } from '@elastic/elasticsearch';
// import { REPO_ROOT } from '@kbn/repo-info';
// import { KbnClient } from '@kbn/test';

// import {
//   saveAction,
//   loadAction,
//   unloadAction,
//   rebuildAllAction,
//   emptyKibanaIndexAction,
//   editAction,
// } from './actions';
//
// interface Options {
//   client: Client;
//   baseDir?: string;
//   log: ToolingLog;
//   kbnClient: KbnClient;
// }

export class BigDataLoader {
  // private readonly client: Client;
  private readonly baseDir: string;
  private readonly log: ToolingLog;
  // private readonly kbnClient: KbnClient;

  constructor(options: any /* : Options */) {
    // this.client = options.client;
    this.baseDir = REPO_ROOT;
    this.log = options.log;
    // this.kbnClient = options.kbnClient;
  }

  async load() {
    // return await loadAction({
    //   inputDir: this.findArchive(path),
    //   skipExisting: !!skipExisting,
    //   useCreate: !!useCreate,
    //   docsOnly,
    //   client: this.client,
    //   log: this.log,
    //   kbnClient: this.kbnClient,
    // });

    this.log.info('\n### Load some big data homie');

    this.log.info(`\n### this.baseDir: \n\t${this.baseDir}`);
    try {
      const { stdout } = await execa('qaf', ['version'], { cwd: this.baseDir });
      this.log.info(`\n### stdout: \n${JSON.stringify(stdout, null, 2)}`);
    } catch (e) {
      this.log.error(`\n### e: \n${JSON.stringify(e, null, 2)}`);
    }
  }

  // async unload(path: string) {
  //   return await unloadAction({
  //     inputDir: this.findArchive(path),
  //     client: this.client,
  //     log: this.log,
  //     kbnClient: this.kbnClient,
  //   });
  // }

  // async loadIfNeeded(name: string) {
  //   return await this.load(name, { skipExisting: true });
  // }
}
