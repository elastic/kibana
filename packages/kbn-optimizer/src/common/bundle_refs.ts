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

import { Bundle } from './bundle';
import { UnknownVals } from './ts_helpers';

export interface BundleRef {
  bundleId: string;
  contextDir: string;
  contextPrefix: string;
  entry: string;
  exportId: string;
}

export class BundleRefs {
  static fromBundles(bundles: Bundle[]) {
    return new BundleRefs(
      bundles.reduce(
        (acc: BundleRef[], b) => [
          ...acc,
          ...b.publicDirNames.map(
            (name): BundleRef => ({
              bundleId: b.id,
              contextDir: b.contextDir,
              // Path.resolve converts separators and strips the final separator
              contextPrefix: Path.resolve(b.contextDir) + Path.sep,
              entry: name,
              exportId: `${b.type}/${b.id}/${name}`,
            })
          ),
        ],
        []
      )
    );
  }

  static parseSpec(json: unknown) {
    if (typeof json !== 'string') {
      throw new Error('expected `bundleRefs` spec to be a JSON string');
    }

    let spec;
    try {
      spec = JSON.parse(json);
    } catch (error) {
      throw new Error('`bundleRefs` spec must be valid JSON');
    }

    if (!Array.isArray(spec)) {
      throw new Error('`bundleRefs` spec must be an array');
    }

    return new BundleRefs(
      spec.map(
        (refSpec: UnknownVals<BundleRef>): BundleRef => {
          if (typeof refSpec !== 'object' || !refSpec) {
            throw new Error('`bundleRefs[]` must be an object');
          }

          const { bundleId } = refSpec;
          if (typeof bundleId !== 'string') {
            throw new Error('`bundleRefs[].bundleId` must be a string');
          }

          const { contextDir } = refSpec;
          if (typeof contextDir !== 'string' || !Path.isAbsolute(contextDir)) {
            throw new Error('`bundleRefs[].contextDir` must be an absolute directory');
          }

          const { contextPrefix } = refSpec;
          if (typeof contextPrefix !== 'string' || !Path.isAbsolute(contextPrefix)) {
            throw new Error('`bundleRefs[].contextPrefix` must be an absolute directory');
          }

          const { entry } = refSpec;
          if (typeof entry !== 'string') {
            throw new Error('`bundleRefs[].entry` must be a string');
          }

          const { exportId } = refSpec;
          if (typeof exportId !== 'string') {
            throw new Error('`bundleRefs[].exportId` must be a string');
          }

          return {
            bundleId,
            contextDir,
            contextPrefix,
            entry,
            exportId,
          };
        }
      )
    );
  }

  constructor(private readonly refs: BundleRef[]) {}

  public filterByExportIds(exportIds: string[]) {
    return this.refs.filter((r) => exportIds.includes(r.exportId));
  }

  public filterByContextPrefix(bundle: Bundle, absolutePath: string) {
    return this.refs.filter(
      (ref) => ref.bundleId !== bundle.id && absolutePath.startsWith(ref.contextPrefix)
    );
  }

  public toSpecJson() {
    return JSON.stringify(this.refs);
  }
}
