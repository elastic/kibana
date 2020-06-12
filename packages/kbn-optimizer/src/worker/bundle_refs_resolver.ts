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

import { Bundle, BundleRefs, BundleRef } from '../common';

const RESOLVE_EXTENSIONS = ['.js', '.ts', '.tsx'];

export class BundleRefsResolver {
  private refsInBundle = new Map<Bundle, Set<BundleRef>>();
  private resolvedRequestCache = new Map<string, Promise<string | undefined>>();

  constructor(public readonly bundleRefs: BundleRefs) {}

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
  async resolveExternal(bundle: Bundle, context: string, request: string) {
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

    const eligibleRefs = this.bundleRefs.filterByContextPrefix(bundle, resolved);
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
