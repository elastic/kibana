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

interface BundleRef {
  id: string;
  contextDir: string;
  contextPrefix: string;
  entry: string;
  exportId: string;
}

interface BundleRefSpec {
  id: string;
  contextDir: string;
  entry: string;
  exportId: string;
}

const RESOLVE_EXTENSIONS = ['.js', '.ts', '.tsx'];

export class BundleRefs {
  static getSpecFromBundles(bundles: Bundle[]) {
    return bundles.reduce(
      (acc: BundleRefSpec[], b) => [
        ...acc,
        ...b.publicDirNames.map((name) => ({
          id: b.id,
          contextDir: b.contextDir,
          entry: name,
          exportId: `${b.type}/${b.id}/${name}`,
        })),
      ],
      []
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
        (zone: UnknownVals<BundleRefSpec>): BundleRef => {
          if (typeof zone !== 'object' || !zone) {
            throw new Error('`bundleRefs[*]` must be an object');
          }

          const { id } = zone;
          if (typeof id !== 'string') {
            throw new Error('`bundleRefs[*].id` must be a string');
          }

          const { contextDir } = zone;
          if (typeof contextDir !== 'string' || !Path.isAbsolute(contextDir)) {
            throw new Error('`bundleRefs[*].contextDir` must be an absolute directory');
          }

          const { entry } = zone;
          if (typeof entry !== 'string') {
            throw new Error('`bundleRefs[*].entry` must be a string');
          }

          const { exportId } = zone;
          if (typeof exportId !== 'string') {
            throw new Error('`bundleRefs[*].exportId` must be a string');
          }

          return {
            id,
            contextDir,
            // Path.resolve converts separators and strips the final separator
            contextPrefix: Path.resolve(contextDir) + Path.sep,
            entry,
            exportId,
          };
        }
      )
    );
  }

  private refsInBundle = new Map<Bundle, Set<BundleRef>>();
  private resolvedRequestCache = new Map<string, Promise<string | undefined>>();

  constructor(private readonly refs: BundleRef[]) {}

  public filterByExportIds(exportIds: string[]) {
    const refs: BundleRef[] = [];
    for (const exportId of exportIds) {
      const ref = this.refs.find((r) => r.exportId === exportId);
      if (ref) {
        refs.push(ref);
      }
    }
    return refs;
  }

  public filterByContextPrefix(bundle: Bundle, absolutePath: string) {
    return this.refs.filter(
      (ref) => ref.id !== bundle.id && absolutePath.startsWith(ref.contextPrefix)
    );
  }

  private cachedResolveRequest(context: string, request: string) {
    const absoluteRequest = Path.resolve(context, request);
    const cached = this.resolvedRequestCache.get(absoluteRequest);

    if (cached) {
      return cached;
    }

    const promise = this.resolveRequest(absoluteRequest);
    this.resolvedRequestCache.set(absoluteRequest, promise);
    return promise;
  }

  // TODO: Implement actual but fast resolver
  private async resolveRequest(absoluteRequest: string) {
    if (absoluteRequest.endsWith('index.ts')) {
      return absoluteRequest;
    }

    return Path.resolve(absoluteRequest, 'index.ts');
  }

  /**
   * Determine externals statements for require/import statements by looking
   * for requests resolving to the primary public export of the data, kibanaReact,
   * amd kibanaUtils plugins. If this module is being imported then rewrite
   * the import to access the global `__kbnBundles__` variables and access
   * the relavent properties from that global object.
   *
   * @param bundle
   * @param context the directory containing the module which made `request`
   * @param request the request for a module from a commonjs require() call or import statement
   */
  async checkForBundleRef(bundle: Bundle, context: string, request: string) {
    // ignore imports that have loaders defined or are not relative seeming
    if (request.includes('!') || !request.startsWith('.')) {
      return;
    }

    const requestExt = Path.extname(request);
    if (requestExt && !RESOLVE_EXTENSIONS.includes(requestExt)) {
      return;
    }

    const resolved = await this.cachedResolveRequest(context, request);

    // the path was not resolved because it should be ignored, failed resolves throw
    if (!resolved) {
      return;
    }

    const eligibleRefs = this.filterByContextPrefix(bundle, resolved);
    if (!eligibleRefs.length) {
      // import doesn't match a bundle context
      return;
    }

    let matchingRef: BundleRef | undefined;
    for (const ref of eligibleRefs) {
      const resolvedEntry = await this.cachedResolveRequest(ref.contextDir, ref.entry);
      if (resolved === resolvedEntry) {
        matchingRef = ref;
      }
    }

    if (!matchingRef) {
      const bundleId = Array.from(new Set(eligibleRefs.map((r) => r.id))).join(', ');
      const publicDir = eligibleRefs.map((r) => r.entry).join(', ');
      throw new Error(
        `import [${request}] references a non-public export of the [${bundleId}] bundle and must point to one of the public directories: [${publicDir}]`
      );
    }

    const refsInBundle = this.refsInBundle.get(bundle) || new Set();
    refsInBundle.add(matchingRef);
    this.refsInBundle.set(bundle, refsInBundle);

    return `__kbnBundles__.get('${matchingRef.exportId}')`;
  }

  getReferencedExportIds(bundle: Bundle) {
    const refsInBundle = this.refsInBundle.get(bundle);

    if (!refsInBundle) {
      return [];
    }

    return Array.from(refsInBundle)
      .map((ref) => ref.exportId)
      .sort((a, b) => a.localeCompare(b));
  }
}
