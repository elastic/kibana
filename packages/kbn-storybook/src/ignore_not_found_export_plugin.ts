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

import { Compiler, Stats } from 'webpack';
// @ts-expect-error
import ModuleDependencyWarning from 'webpack/lib/ModuleDependencyWarning';

export class IgnoreNotFoundExportPlugin {
  apply(compiler: Compiler) {
    const messageRegExp = /export '.*'( \(reexported as '.*'\))? was not found in/;

    function doneHook(stats: Stats) {
      stats.compilation.warnings = stats.compilation.warnings.filter(function (warn) {
        if (warn instanceof ModuleDependencyWarning && messageRegExp.test(warn.message)) {
          return false;
        }
        return true;
      });
    }

    if (compiler.hooks) {
      compiler.hooks.done.tap('IgnoreNotFoundExportPlugin', doneHook);
    } else {
      // @ts-ignore
      compiler.plugin('done', doneHook);
    }
  }
}
