/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ts = require('typescript');
const path = require('path');

function format(target, diagnostics) {
  const diagnosticsHost = {
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getNewLine: () => ts.sys.newLine,
    // Print filenames including their relativeRoot, so they can be located on
    // disk
    getCanonicalFileName: (f) => f,
  };
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticsHost);
}

function resolveNormalizedPath(...segments) {
  return path.resolve(...segments).replace(/\\/g, '/');
}

function parseTsconfig(tsconfigFile, host = ts.sys) {
  // TypeScript expects an absolute path for the tsconfig.json file
  tsconfigFile = resolveNormalizedPath(tsconfigFile);

  const isUndefined = (value) => value === undefined;

  // Handle bazel specific options, but make sure not to crash when reading a
  // vanilla tsconfig.json.

  const readExtendedConfigFile = (configFile, existingConfig) => {
    const { config, error } = ts.readConfigFile(configFile, host.readFile);

    if (error) {
      return { error };
    }

    // Allow Bazel users to control some of the bazel options.
    // Since TypeScript's "extends" mechanism applies only to "compilerOptions"
    // we have to repeat some of their logic to get the user's bazelOptions.
    const mergedConfig = existingConfig || config;

    if (existingConfig) {
      const existingBazelOpts = existingConfig.bazelOptions || {};
      const newBazelBazelOpts = config.bazelOptions || {};

      mergedConfig.bazelOptions = {
        ...existingBazelOpts,

        disableStrictDeps: isUndefined(existingBazelOpts.disableStrictDeps)
          ? newBazelBazelOpts.disableStrictDeps
          : existingBazelOpts.disableStrictDeps,

        suppressTsconfigOverrideWarnings: isUndefined(
          existingBazelOpts.suppressTsconfigOverrideWarnings
        )
          ? newBazelBazelOpts.suppressTsconfigOverrideWarnings
          : existingBazelOpts.suppressTsconfigOverrideWarnings,

        tsickle: isUndefined(existingBazelOpts.tsickle)
          ? newBazelBazelOpts.tsickle
          : existingBazelOpts.tsickle,

        googmodule: isUndefined(existingBazelOpts.googmodule)
          ? newBazelBazelOpts.googmodule
          : existingBazelOpts.googmodule,

        devmodeTargetOverride: isUndefined(existingBazelOpts.devmodeTargetOverride)
          ? newBazelBazelOpts.devmodeTargetOverride
          : existingBazelOpts.devmodeTargetOverride,
      };
    }

    if (config.extends) {
      let extendedConfigPath = resolveNormalizedPath(path.dirname(configFile), config.extends);
      if (!extendedConfigPath.endsWith('.json')) extendedConfigPath += '.json';

      return readExtendedConfigFile(extendedConfigPath, mergedConfig);
    }

    return { config: mergedConfig };
  };

  const { config, error } = readExtendedConfigFile(tsconfigFile);
  if (error) {
    // target is in the config file we failed to load...
    return [null, [error], { target: '' }];
  }

  const { options, errors, fileNames } = ts.parseJsonConfigFileContent(
    config,
    host,
    path.dirname(tsconfigFile)
  );

  // Handle bazel specific options, but make sure not to crash when reading a
  // vanilla tsconfig.json.
  const bazelOpts = config.bazelOptions || {};
  const target = bazelOpts.target;
  bazelOpts.allowedStrictDeps = bazelOpts.allowedStrictDeps || [];
  bazelOpts.typeBlackListPaths = bazelOpts.typeBlackListPaths || [];
  bazelOpts.compilationTargetSrc = bazelOpts.compilationTargetSrc || [];

  if (errors && errors.length) {
    return [null, errors, { target }];
  }

  // Override the devmode target if devmodeTargetOverride is set
  if (bazelOpts.es5Mode && bazelOpts.devmodeTargetOverride) {
    switch (bazelOpts.devmodeTargetOverride.toLowerCase()) {
      case 'es3':
        options.target = ts.ScriptTarget.ES3;
        break;
      case 'es5':
        options.target = ts.ScriptTarget.ES5;
        break;
      case 'es2015':
        options.target = ts.ScriptTarget.ES2015;
        break;
      case 'es2016':
        options.target = ts.ScriptTarget.ES2016;
        break;
      case 'es2017':
        options.target = ts.ScriptTarget.ES2017;
        break;
      case 'es2018':
        options.target = ts.ScriptTarget.ES2018;
        break;
      case 'esnext':
        options.target = ts.ScriptTarget.ESNext;
        break;
      default:
        console.error(
          "WARNING: your tsconfig.json file specifies an invalid bazelOptions.devmodeTargetOverride value of: '${bazelOpts.devmodeTargetOverride'"
        );
    }
  }

  // Sort rootDirs with longest include directories first.
  // When canonicalizing paths, we always want to strip
  // `workspace/bazel-bin/file` to just `file`, not to `bazel-bin/file`.
  if (options.rootDirs) options.rootDirs.sort((a, b) => b.length - a.length);

  // If the user requested goog.module, we need to produce that output even if
  // the generated tsconfig indicates otherwise.
  if (bazelOpts.googmodule) options.module = ts.ModuleKind.CommonJS;

  // TypeScript's parseJsonConfigFileContent returns paths that are joined, eg.
  // /path/to/project/bazel-out/arch/bin/path/to/package/../../../../../../path
  // We normalize them to remove the intermediate parent directories.
  // This improves error messages and also matches logic in tsc_wrapped where we
  // expect normalized paths.
  const files = fileNames.map((f) => path.posix.normalize(f));

  // The bazelOpts paths in the tsconfig are relative to
  // options.rootDir (the workspace root) and aren't transformed by
  // parseJsonConfigFileContent (because TypeScript doesn't know
  // about them). Transform them to also be absolute here.
  bazelOpts.compilationTargetSrc = bazelOpts.compilationTargetSrc.map((f) =>
    resolveNormalizedPath(options.rootDir, f)
  );
  bazelOpts.allowedStrictDeps = bazelOpts.allowedStrictDeps.map((f) =>
    resolveNormalizedPath(options.rootDir, f)
  );
  bazelOpts.typeBlackListPaths = bazelOpts.typeBlackListPaths.map((f) =>
    resolveNormalizedPath(options.rootDir, f)
  );
  if (bazelOpts.nodeModulesPrefix) {
    bazelOpts.nodeModulesPrefix = resolveNormalizedPath(
      options.rootDir,
      bazelOpts.nodeModulesPrefix
    );
  }
  if (bazelOpts.angularCompilerOptions && bazelOpts.angularCompilerOptions.assets) {
    bazelOpts.angularCompilerOptions.assets = bazelOpts.angularCompilerOptions.assets.map((f) =>
      resolveNormalizedPath(options.rootDir, f)
    );
  }

  let disabledTsetseRules = [];
  for (const pluginConfig of options.plugins || []) {
    if (pluginConfig.name && pluginConfig.name === '@bazel/tsetse') {
      const disabledRules = pluginConfig.disabledRules;
      if (disabledRules && !Array.isArray(disabledRules)) {
        throw new Error('Disabled tsetse rules must be an array of rule names');
      }
      disabledTsetseRules = disabledRules;
      break;
    }
  }

  return [{ options, bazelOpts, files, config, disabledTsetseRules }, null, { target }];
}

module.exports.format = format;
module.exports.parseTsconfig = parseTsconfig;
