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

import globby from 'globby';
import loadJsonFile from 'load-json-file';

export interface KibanaPlatformPlugin {
  readonly directory: string;
  readonly id: string;
  readonly isUiPlugin: boolean;
  readonly extraPublicDirs: string[];
}

/**
 * Helper to find the new platform plugins.
 */
export function findKibanaPlatformPlugins(scanDirs: string[], paths: string[]) {
  return globby
    .sync(
      Array.from(
        new Set([
          ...scanDirs.map(nestedScanDirPaths).reduce((dirs, current) => [...dirs, ...current], []),
          ...paths.map((path) => `${path}/kibana.json`),
        ])
      ),
      {
        absolute: true,
      }
    )
    .map((path) =>
      // absolute paths returned from globby are using normalize or something so the path separators are `/` even on windows, Path.resolve solves this
      readKibanaPlatformPlugin(Path.resolve(path))
    );
}

function nestedScanDirPaths(dir: string): string[] {
  // down to 5 level max
  return [
    `${dir}/*/kibana.json`,
    `${dir}/*/*/kibana.json`,
    `${dir}/*/*/*/kibana.json`,
    `${dir}/*/*/*/*/kibana.json`,
    `${dir}/*/*/*/*/*/kibana.json`,
  ];
}

function readKibanaPlatformPlugin(manifestPath: string): KibanaPlatformPlugin {
  if (!Path.isAbsolute(manifestPath)) {
    throw new TypeError('expected new platform manifest path to be absolute');
  }

  const manifest = loadJsonFile.sync(manifestPath);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('expected new platform plugin manifest to be a JSON encoded object');
  }

  if (typeof manifest.id !== 'string') {
    throw new TypeError('expected new platform plugin manifest to have a string id');
  }

  let extraPublicDirs: string[] | undefined;
  if (manifest.extraPublicDirs) {
    if (
      !Array.isArray(manifest.extraPublicDirs) ||
      !manifest.extraPublicDirs.every((p) => typeof p === 'string')
    ) {
      throw new TypeError(
        'expected new platform plugin manifest to have an array of strings `extraPublicDirs` property'
      );
    }

    extraPublicDirs = manifest.extraPublicDirs as string[];
  }

  return {
    directory: Path.dirname(manifestPath),
    id: manifest.id,
    isUiPlugin: !!manifest.ui,
    extraPublicDirs: extraPublicDirs || [],
  };
}
