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

import configModel from './config_model';
import { runWebpack } from '../webpack_wrapper';
import fs from 'fs';

export class Compiler {
  static existsDLLsFromConfig({ dllEntries, outputPath }) {
    return dllEntries.reduce(
      (accumulator, currentValue) => {
        const dllEntryFile = `${outputPath}/${currentValue.name}.entry.dll.js`;
        const dllManifestFile = `${outputPath}/${currentValue.name}.json`;
        const dllFile = `${outputPath}/${currentValue.name}.dll.js`;

        return fs.existsSync(dllEntryFile) && fs.existsSync(dllManifestFile) && fs.existsSync(dllFile);
      },
      true);
  }

  constructor(options, log) {
    this.dllEntries = options.dllEntries;
    this.isDistributable = options.isDistributable;
    this.outputPath = options.outputPath;
    this.dllsConfigs = this.createDLLsConfigs(options);
    this.log =  log;

    if (!this.existsDLLs()) {
      this.upsertDllEntryFile();
      this.touchDllManifests();
    }
  }

  createDLLsConfigs(options) {
    return options.dllEntries.map((dllEntry) => this.dllConfigGenerator({
      dllEntry,
      ...options
    }));
  }

  dllConfigGenerator(dllConfig) {
    return configModel.bind(this, dllConfig);
  }

  upsertDllEntryFile(entryPaths = [], entryName = 'vendor') {
    const dllEntry = this.dllEntries.find((entry) => {
      return entry.name === entryName;
    });

    if (!dllEntry) {
      return;
    }

    const data = entryPaths.reduce(
      (accumulator, currentValue) => {
        return accumulator + `require('${currentValue}');\n`;
      },
      '\n'
    );

    const entryFileName = `${this.outputPath}/${entryName}.entry.dll.js`;
    fs.writeFileSync(entryFileName, data);
  }

  touchDllManifests() {
    this.dllEntries.forEach((dllEntry) => {
      fs.writeFileSync(
        `${this.outputPath}/${dllEntry.name}.json`,
        '{}'
      );
    });
  }

  existsDLLs() {
    return Compiler.existsDLLsFromConfig({ dllEntries: this.dllEntries, outputPath: this.outputPath });
  }

  async run() {
    for (const dllConfig of this.dllsConfigs) {
      await runWebpack(dllConfig());
    }
  }
}
