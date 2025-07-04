/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { Package } from '@kbn/repo-packages';
import { createFailError } from '@kbn/dev-cli-errors';

/**
 * These aliases are used to ensure the values for different flags are collected in a single set.
 */
const ALIASES = new Map([
  // --base-path and --no-base-path inform the same config as `server.basePath`, so deduplicate them
  // by treating "base-path" as an alias for "server.basePath"
  ['base-path', 'server.basePath'],
]);

/**
 * These are the only flag names that allow duplicate definitions
 */
const ALLOW_DUPLICATES = new Set(['plugin-path']);

export type KibanaCliArg = string & {
  readonly __cliArgBrand: unique symbol;
};

/**
 * Ensure that cli args are always specified as ["--flag=value", "--other-flag"] and not ["--flag", "value"]
 */
function assertCliArg(arg: string): asserts arg is KibanaCliArg {
  if (typeof arg !== 'string' || !arg.startsWith('--')) {
    throw new Error(
      `invalid CLI arg [${arg}], all args must start with "--" and values must be specified after an "=" in a single string per arg`
    );
  }
}

/**
 * Get the name of an arg, stripping the `--` and `no-` prefixes, and values
 *
 *  --no-base-path => base-path
 *  --base-path => base-path
 *  --server.basePath=foo => server.basePath
 */
function argName(arg: KibanaCliArg) {
  const unflagged = arg.slice(2);
  const i = unflagged.indexOf('=');
  const withoutValue = i === -1 ? unflagged : unflagged.slice(0, i);
  return withoutValue.startsWith('no-') ? withoutValue.slice(3) : withoutValue;
}

export type ArgValue = boolean | string | number | Record<string, unknown> | unknown[] | null;

const argToValue = (arg: KibanaCliArg): ArgValue => {
  if (arg.startsWith('--no-')) {
    return false;
  }

  const i = arg.indexOf('=');
  if (i === -1) {
    return true;
  }

  const value = arg.slice(i + 1);
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

/**
 * Get the value of an arg from the CliArg flags.
 */
export function getArgValue(args: KibanaCliArg[], name: string): ArgValue | ArgValue[] | undefined {
  if (ALLOW_DUPLICATES.has(name)) {
    return args.filter((a) => argName(a) === name).map(argToValue);
  }

  for (const arg of args) {
    if (argName(arg) === name) {
      return argToValue(arg);
    }
  }
}

export function parseRawFlags(rawFlags: string[]) {
  // map of CliArg values by their name, this allows us to deduplicate flags and ensure
  // that the last flag wins
  const cliArgs = new Map<string, KibanaCliArg | KibanaCliArg[]>();

  for (const arg of rawFlags) {
    assertCliArg(arg);
    let name = argName(arg);
    const alias = ALIASES.get(name);
    if (alias !== undefined) {
      name = alias;
    }

    const existing = cliArgs.get(name);
    const allowsDuplicate = ALLOW_DUPLICATES.has(name);

    if (!existing || !allowsDuplicate) {
      cliArgs.set(name, arg);
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(arg);
    } else {
      cliArgs.set(name, [existing, arg]);
    }
  }

  if (cliArgs.has('oss')) {
    throw new Error(`--oss is not a valid flag to pass in FTR config files`);
  }

  return [...cliArgs.entries()]
    .sort(([a], [b]) => {
      const aDot = a.includes('.');
      const bDot = b.includes('.');
      return aDot === bDot ? a.localeCompare(b) : aDot ? 1 : -1;
    })
    .map((a) => a[1])
    .flat();
}

/**
 * Parse a list of Kibana CLI Arg flags and find the flag with the given name. If the flag has no
 * value then a boolean will be returned (assumed to be a switch flag). If the flag does have a value
 * that can be parsed by `JSON.stringify()` the parsed result is returned. Otherwise the raw string
 * value is returned.
 */
export function getKibanaCliArg(rawFlags: string[], name: string) {
  return getArgValue(parseRawFlags(rawFlags), name);
}

/**
 * Parse the list of Kibana CLI Arg flags and extract the loggers config so that they can be extended
 * in a subsequent FTR config
 */
export function getKibanaCliLoggers(rawFlags: string[]) {
  const value = getKibanaCliArg(rawFlags, 'logging.loggers');

  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

/**
 * Parse the list of Kibana CLI Arg flags and extract the loggers config so that they can be extended
 * in a subsequent FTR config
 */
export function remapPluginPaths(args: KibanaCliArg[], kibanaInstallDir: string) {
  return args.map((arg) => {
    if (argName(arg) !== 'plugin-path') {
      return arg;
    }

    const value = argToValue(arg);
    if (typeof value !== 'string') {
      return arg;
    }

    let pkg;
    try {
      pkg = Package.fromManifest(REPO_ROOT, Path.resolve(value, 'kibana.jsonc'));
    } catch (error) {
      throw createFailError(`Unable to load plugin at ${arg}: ${error.message}`);
    }

    const newPath = Path.resolve(kibanaInstallDir, 'node_modules', pkg.manifest.id);
    const newArg = `--plugin-path=${newPath}`;

    assertCliArg(newArg);
    return newArg;
  });
}
