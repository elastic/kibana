/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';

export type TypeCheckCompilerName = 'tsc' | 'tsgo';

export interface TypeCheckCompiler {
  args: string[];
  cmd: string;
  name: TypeCheckCompilerName;
}

interface ResolveTypeCheckCompilerOptions {
  resolveModule?: (request: string) => string;
}

const DEFAULT_TYPE_CHECK_COMPILER: TypeCheckCompilerName = 'tsc';

// Package name used to resolve the local tsgo binary and to build the npx
// fallback specifier. When updating the pinned version, change ONLY the version
// string below — the package name is shared with the local-resolution path.
const TSGO_PACKAGE_NAME = '@typescript/native-preview';
const TSGO_PINNED_VERSION = '7.0.0-dev.20260310.1';

const isMissingModuleError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND';

export const resolveTypeCheckCompiler = (
  compilerName: string | undefined = DEFAULT_TYPE_CHECK_COMPILER,
  { resolveModule = require.resolve }: ResolveTypeCheckCompilerOptions = {}
): TypeCheckCompiler => {
  switch (compilerName) {
    case 'tsc':
      return {
        name: 'tsc',
        cmd: resolveModule('typescript/bin/tsc'),
        args: [],
      };

    case 'tsgo':
      try {
        return {
          name: 'tsgo',
          cmd: resolveModule(`${TSGO_PACKAGE_NAME}/bin/tsgo.js`),
          args: [],
        };
      } catch (error) {
        if (!isMissingModuleError(error)) {
          throw error;
        }

        return {
          name: 'tsgo',
          cmd: 'npx',
          args: ['-y', `${TSGO_PACKAGE_NAME}@${TSGO_PINNED_VERSION}`],
        };
      }

    default:
      throw createFailError(
        `Unsupported type-check compiler "${compilerName}". Expected one of: tsc, tsgo.`
      );
  }
};
