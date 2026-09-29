/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare const _exports: {
  kbnVitestPlugins: typeof kbnVitestPlugins;
};
export = _exports;
declare const kbnVitestPlugins: () => (
  | {
      name: string;
      enforce: string;
      resolveId(source: any, importer: any, options: any): Promise<any>;
      load(id: any): any;
    }
  | {
      name: string;
      enforce: string;
      configureVitest({ defineCacheKeyGenerator }: { defineCacheKeyGenerator: any }): void;
      transform(
        code: any,
        id: any
      ): Promise<{
        code: string;
        map: any;
      } | null>;
    }
)[];
