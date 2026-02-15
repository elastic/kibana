/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CheckToRun, QuickChecksContext } from '../types';

/**
 * Build the command string that will be executed for a check
 */
export function getCommandForCheck(check: CheckToRun, context: QuickChecksContext): string {
  const { script, nodeCommand, filesArg, pathArg, packagesArg, positionalPackages } = check;
  const { isCI, targetFiles, targetPackages } = context;

  // When running locally (not CI) and a nodeCommand is available, run it directly
  if (!isCI && nodeCommand) {
    let fullCommand = nodeCommand;

    const args: string[] = [];

    if (targetFiles && filesArg) {
      args.push(`${filesArg} ${targetFiles}`);
    }

    if (targetPackages) {
      if (positionalPackages) {
        args.push(targetPackages.split(',').join(' '));
      } else if (packagesArg) {
        args.push(`${packagesArg} ${targetPackages}`);
      } else if (pathArg) {
        const pathArgs = targetPackages
          .split(',')
          .map((pkg) => `${pathArg} ./${pkg}`)
          .join(' ');

        args.push(pathArgs);
      }
    }

    if (args.length > 0) {
      fullCommand = `${nodeCommand} ${args.join(' ')}`;
    }

    return fullCommand;
  }

  // In CI or when no nodeCommand, use shell script
  return `bash ${script}`;
}
