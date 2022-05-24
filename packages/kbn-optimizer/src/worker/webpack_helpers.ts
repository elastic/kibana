/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import webpack from 'webpack';
// @ts-ignore
import Stats from 'webpack/lib/Stats';

export function isFailureStats(stats: webpack.Stats) {
  if (stats.hasErrors()) {
    return true;
  }

  const { warnings } = stats.toJson({ all: false, warnings: true });

  // 1 - when typescript doesn't do a full type check, as we have the ts-loader
  // configured here, it does not have enough information to determine
  // whether an imported name is a type or not, so when the name is then
  // exported, typescript has no choice but to emit the export. Fortunately,
  // the extraneous export should not be harmful, so we just suppress these warnings
  // https://github.com/TypeStrong/ts-loader#transpileonly-boolean-defaultfalse
  //
  // 2 - Mini Css Extract plugin tracks the order for each css import we have
  // through the project (and it's successive imports) since version 0.4.2.
  // In case we have the same imports more than one time with different
  // sequences, this plugin will throw a warning. This should not be harmful,
  // but the an issue was opened and can be followed on:
  // https://github.com/webpack-contrib/mini-css-extract-plugin/issues/250#issuecomment-415345126
  const filteredWarnings = Stats.filterWarnings(warnings, STATS_WARNINGS_FILTER);

  return filteredWarnings.length > 0;
}

const STATS_WARNINGS_FILTER = new RegExp(
  [
    '(export .* was not found in)',
    '|(chunk .* \\[mini-css-extract-plugin\\]\\\nConflicting order between:)',
  ].join('')
);

export function failedStatsToErrorMessage(stats: webpack.Stats) {
  const details = stats.toString({
    ...Stats.presetToOptions('minimal'),
    colors: true,
    warningsFilter: STATS_WARNINGS_FILTER,
    errors: true,
    errorDetails: true,
    moduleTrace: true,
  });

  return `Optimizations failure.\n${details.split('\n').join('\n    ')}`;
}

export interface WebpackResolveData {
  /** compilation context */
  context: string;
  /** full request (with loaders) */
  request: string;
  dependencies: [
    {
      module: unknown;
      weak: boolean;
      optional: boolean;
      loc: unknown;
      request: string;
      userRequest: string;
    }
  ];
  /** absolute path, but probably includes loaders in some cases */
  userRequest: string;
  /** string from source code */
  rawRequest: string;
  loaders: unknown;
  /** absolute path to file, but probablt includes loaders in some cases */
  resource: string;
  /** module type */
  type: string | 'javascript/auto';

  resourceResolveData: {
    context: {
      /** absolute path to the file that issued the request */
      issuer: string;
    };
    /** absolute path to the resolved file */
    path: string;
  };
}

interface Dependency {
  type: 'null' | 'cjs require';
  module: unknown;
}

/** used for standard js/ts modules */
export interface WebpackNormalModule {
  type: string;
  /** absolute path to file on disk */
  resource: string;
  buildInfo: {
    cacheable: boolean;
    fileDependencies: Set<string>;
  };
  dependencies: Dependency[];
}

export function isNormalModule(module: any): module is WebpackNormalModule {
  return module?.constructor?.name === 'NormalModule';
}

/** module used for ignored code */
export interface WebpackIgnoredModule {
  type: string;
  /** unique string to identify this module with (starts with `ignored`) */
  identifierStr: string;
  /** human readable identifier */
  readableIdentifierStr: string;
}

export function isIgnoredModule(module: any): module is WebpackIgnoredModule {
  return module?.constructor?.name === 'RawModule' && module.identifierStr?.startsWith('ignored ');
}

/** module replacing imports for webpack externals */
export interface WebpackExternalModule {
  type: string;
  id: string;
  /** JS used to get instance of External */
  request: string;
  /** module name that is handled by externals */
  userRequest: string;
}

export function isExternalModule(module: any): module is WebpackExternalModule {
  return module?.constructor?.name === 'ExternalModule';
}

/** module replacing imports for webpack externals */
export interface WebpackConcatenatedModule {
  type: string;
  id: number;
  dependencies: Dependency[];
  usedExports: string[];
  modules: unknown[];
}

export function isConcatenatedModule(module: any): module is WebpackConcatenatedModule {
  return module?.constructor?.name === 'ConcatenatedModule';
}

/** module replacing imports for DLL referenced */
export interface WebpackDelegatedModule {
  type: string;
  id: number;
  dependencies: unknown[];
  /** The ID of the module in the DLL manifest */
  userRequest: string;
}

export function isDelegatedModule(module: any): module is WebpackDelegatedModule {
  return module?.constructor?.name === 'DelegatedModule';
}

export function getModulePath(module: WebpackNormalModule) {
  const queryIndex = module.resource.indexOf('?');
  return queryIndex === -1 ? module.resource : module.resource.slice(0, queryIndex);
}
