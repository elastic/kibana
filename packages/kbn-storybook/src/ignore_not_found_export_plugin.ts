/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// derived from https://github.com/TypeStrong/ts-loader/issues/653#issuecomment-390889335
//
// This plugin suppresses the irritating TS-related warnings in Storybook HMR.

import { Compiler } from 'webpack';

export class IgnoreNotFoundExportPlugin {
  apply(compiler: Compiler) {
    const messageRegExp = /export '.*'( \(reexported as '.*'\))? was not found in/;

    compiler.hooks.done.tap('IgnoreNotFoundExportPlugin', (stats) => {
      if (stats.compilation.warnings) {
        stats.compilation.warnings = stats.compilation.warnings.filter((warning) => {
          // In webpack 5, we check if the warning message matches our pattern
          // instead of checking the instanceof ModuleDependencyWarning
          if (warning && warning.message && messageRegExp.test(warning.message)) {
            return false;
          }
          return true;
        });
      }
    });
  }
}
