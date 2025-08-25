/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reporter, ReporterOnStartOptions } from '@jest/reporters';
import type { AggregatedResult } from '@jest/test-result';
import type { Config } from '@jest/types';
import Fs from 'fs';
import Path from 'path';

/**
 * Custom Jest reporter that writes JSON results to a file specified by globalConfig.outputFile
 */
// eslint-disable-next-line import/no-default-export
export default class JsonReporter implements Reporter {
  private _globalConfig: Config.GlobalConfig;

  constructor(globalConfig: Config.GlobalConfig) {
    this._globalConfig = globalConfig;
  }

  onRunStart(_results?: AggregatedResult, _options?: ReporterOnStartOptions): void {}

  async onRunComplete(_contexts?: Set<any>, results?: AggregatedResult): Promise<void> {
    if (!this._globalConfig.outputFile) {
      return;
    }

    const outputPath = this._globalConfig.outputFile;

    console.log(`Writing file to ${outputPath}`);

    await Fs.promises.mkdir(Path.dirname(outputPath), { recursive: true });

    await Fs.promises.writeFile(outputPath, JSON.stringify(results ?? {}, null, 2), 'utf8');
  }
}
