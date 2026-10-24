/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { SourceMap, type SourceOrigin } from 'module';

// Browser bundles below `/bundles/<prefix>`, which Firefox and Safari put after an `@` and the
// function name.
const bundleLocation = (prefix: string) =>
  new RegExp(
    String.raw`(?<![^\s("'@])[^\s("'@]*\/bundles\/${prefix}([^\s():"']{1,1024}?\.js):(\d+):(\d+)`,
    'g'
  );

// Locations of server files and browser bundles, capturing the path relative to `dir`, line and
// column. Starting after whitespace, `(` or a quote leaves JSON intact, and bounded paths keep long
// text fast to match.
const LOCATIONS = [
  {
    dir: '',
    re: /(?<![^\s("'])[^\s("']*(node_modules[\\/]+@kbn[\\/]+[^\s():"']{1,1024}?\.js):(\d+):(\d+)/g,
  },
  // Shared deps are served from their packages, so they're matched before other bundles.
  ...['npm', 'src'].map((name) => ({
    dir: `node_modules/@kbn/ui-shared-deps-${name}/shared_built_assets`,
    re: bundleLocation(`kbn-ui-shared-deps-${name}/`),
  })),
  { dir: 'target/public/bundles', re: bundleLocation('') },
];

/** Creates a function rewriting Kibana's locations in any text using the source maps in `kibanaDir`. */
export function createStackTraceResolver(kibanaDir: string): (text: string) => string {
  const maps = new Map<string, SourceMap | undefined>();
  const getMap = (file: string) => {
    if (!maps.has(file)) {
      try {
        maps.set(file, new SourceMap(JSON.parse(Fs.readFileSync(file, 'utf8'))));
      } catch {
        maps.set(file, undefined);
      }
    }
    return maps.get(file);
  };

  return (text) =>
    LOCATIONS.reduce(
      (result, { dir, re }) =>
        result.replace(re, (location, path: string, line: string, column: string) => {
          const root = Path.join(kibanaDir, dir);
          const file = Path.join(root, `${path.replaceAll('\\', '/')}.map`);
          // Only source maps in the directory the files ship in.
          const origin: Partial<SourceOrigin> | undefined = file.startsWith(root + Path.sep)
            ? getMap(file)?.findOrigin(Number(line), Number(column))
            : undefined;
          return origin?.fileName
            ? `${origin.fileName}:${origin.lineNumber}:${origin.columnNumber}`
            : location;
        }),
      text
    );
}
