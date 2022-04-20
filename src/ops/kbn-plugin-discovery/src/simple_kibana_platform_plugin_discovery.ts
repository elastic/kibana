/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import globby from 'globby';
import normalize from 'normalize-path';

import { parseKibanaPlatformPlugin, KibanaPlatformPlugin } from './parse_kibana_platform_plugin';

/**
 * Helper to find the new platform plugins.
 */
export function simpleKibanaPlatformPluginDiscovery(
  scanDirs: string[],
  pluginPaths: string[]
): KibanaPlatformPlugin[] {
  const patterns = Array.from(
    new Set([
      // find kibana.json files up to 5 levels within the scan dir
      ...scanDirs.reduce(
        (acc: string[], dir) => [
          ...acc,
          Path.resolve(dir, '*/kibana.json'),
          Path.resolve(dir, '*/*/kibana.json'),
          Path.resolve(dir, '*/*/*/kibana.json'),
          Path.resolve(dir, '*/*/*/*/kibana.json'),
          Path.resolve(dir, '*/*/*/*/*/kibana.json'),
        ],
        []
      ),
      ...pluginPaths.map((path) => Path.resolve(path, `kibana.json`)),
    ])
  ).map((path) => normalize(path));

  const manifestPaths = globby.sync(patterns, { absolute: true }).map((path) =>
    // absolute paths returned from globby are using normalize or
    // something so the path separators are `/` even on windows,
    // Path.resolve solves this
    Path.resolve(path)
  );

  return manifestPaths.map(parseKibanaPlatformPlugin);
}
