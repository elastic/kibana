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

import Path from 'path';

import { BundleCache } from './bundle_cache';
import { UnknownVals } from './ts_helpers';
import { includes } from './array_helpers';

export const VALID_BUNDLE_TYPES = ['plugin' as const];

export interface BundleSpec {
  readonly type: typeof VALID_BUNDLE_TYPES[0];
  /** Unique id for this bundle */
  readonly id: string;
  /** Webpack entry request for this plugin, relative to the contextDir */
  readonly entry: string;
  /** Absolute path to the plugin source directory */
  readonly contextDir: string;
  /** Absolute path to the root of the repository */
  readonly sourceRoot: string;
  /** Absolute path to the directory where output should be written */
  readonly outputDir: string;
}

export class Bundle {
  public readonly type: BundleSpec['type'];
  public readonly id: BundleSpec['id'];
  public readonly entry: BundleSpec['entry'];
  public readonly contextDir: BundleSpec['contextDir'];
  public readonly sourceRoot: BundleSpec['sourceRoot'];
  public readonly outputDir: BundleSpec['outputDir'];

  public readonly cache: BundleCache;

  public static parseSpec(spec: UnknownVals<BundleSpec>) {
    if (!(spec && typeof spec === 'object')) {
      throw new Error('`bundles[]` must be an object');
    }

    const { type } = spec;
    if (!includes(VALID_BUNDLE_TYPES, type)) {
      throw new Error('`bundles[]` must have a valid `type`');
    }

    const { id } = spec;
    if (!(typeof id === 'string')) {
      throw new Error('`bundles[]` must have a string `id` property');
    }

    const { entry } = spec;
    if (!(typeof entry === 'string')) {
      throw new Error('`bundles[]` must have a string `entry` property');
    }

    const { contextDir } = spec;
    if (!(typeof contextDir === 'string' && Path.isAbsolute(contextDir))) {
      throw new Error('`bundles[]` must have a string `contextDir` property');
    }

    const { sourceRoot } = spec;
    if (!(typeof sourceRoot === 'string' && Path.isAbsolute(sourceRoot))) {
      throw new Error('`bundles[]` must have a string `sourceRoot` property');
    }

    const { outputDir } = spec;
    if (typeof outputDir !== 'string') {
      throw new Error('`bundles[]` must have a string `outputDir` property');
    }

    return new Bundle({
      type,
      id,
      entry,
      contextDir,
      sourceRoot,
      outputDir,
    });
  }

  constructor(spec: BundleSpec) {
    this.type = spec.type;
    this.id = spec.id;
    this.entry = spec.entry;
    this.contextDir = spec.contextDir;
    this.sourceRoot = spec.sourceRoot;
    this.outputDir = spec.outputDir;

    this.cache = new BundleCache(Path.resolve(this.outputDir, '.kbn-optimizer-cache'));
  }

  public getModuleCount() {
    return this.cache.getModuleCount();
  }

  toSpec(): BundleSpec {
    return {
      type: this.type,
      id: this.id,
      entry: this.entry,
      contextDir: this.contextDir,
      sourceRoot: this.sourceRoot,
      outputDir: this.outputDir,
    };
  }
}

export function parseBundles(json: string) {
  try {
    if (typeof json !== 'string') {
      throw new Error('must be a JSON string');
    }

    const specs: Array<UnknownVals<BundleSpec>> = JSON.parse(json);

    if (!Array.isArray(specs)) {
      throw new Error('must be an array');
    }

    return specs.map(spec => Bundle.parseSpec(spec));
  } catch (error) {
    throw new Error(`unable to parse bundles: ${error.message}`);
  }
}
