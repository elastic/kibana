/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import webpack from 'webpack';

import { Bundle } from '../common';

export class EmitStatsPlugin {
  constructor(private readonly bundle: Bundle) {}

  public apply(compiler: webpack.Compiler) {
    compiler.hooks.done.tap('EmitStatsPlugin', (stats) => {
      Fs.writeFileSync(
        Path.resolve(this.bundle.outputDir, 'stats.json'),
        JSON.stringify(stats.toJson())
      );
    });
  }
}
