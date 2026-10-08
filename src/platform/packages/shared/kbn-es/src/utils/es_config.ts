/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { createCliError } from '../errors';

/**
 * Location of the checked-in, shared base config file for Elasticsearch.
 * Mirrors `config/kibana.yml`: it's always loaded, so any setting checked
 * in here becomes the new default for everyone running `es`.
 */
export const ES_CONFIG_PATH = resolve(REPO_ROOT, 'config', 'es.yml');

/**
 * Location of the optional, git-ignored dev config file for Elasticsearch.
 * Mirrors `config/kibana.dev.yml`: loaded after `config/es.yml`, so it can
 * override it, but only ever affects your own local checkout.
 */
export const ES_DEV_CONFIG_PATH = resolve(REPO_ROOT, 'config', 'es.dev.yml');

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Flattens a (possibly nested) settings object into `key.path=value` strings,
 * the same way Elasticsearch itself accepts either nested or dotted YAML in
 * `elasticsearch.yml`.
 */
function flattenToEsArgs(value: unknown, path: string[], configPath: string): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    if (path.length === 0) {
      throw createCliError(`Invalid ${configPath}: expected a mapping, but found a list`);
    }
    return [`${path.join('.')}=${value.map((item) => String(item)).join(',')}`];
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, subValue]) =>
      flattenToEsArgs(subValue, [...path, key], configPath)
    );
  }

  if (path.length === 0) {
    throw createCliError(`Invalid ${configPath}: expected a mapping of settings`);
  }

  return [`${path.join('.')}=${String(value)}`];
}

/**
 * Loads a YAML config file, if present, and flattens its contents into
 * `-E`-style `key=value` settings that can be merged into the esArgs used to
 * start Elasticsearch. Returns an empty array when the file doesn't exist.
 */
function loadEsYamlEsArgs(configPath: string, log?: ToolingLog): string[] {
  if (!existsSync(configPath)) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw createCliError(`Failed to parse ${configPath}: ${error.message}`);
  }

  if (parsed == null) {
    return [];
  }

  if (!isPlainObject(parsed)) {
    throw createCliError(`Expected ${configPath} to parse to an object of Elasticsearch settings`);
  }

  const esArgs = flattenToEsArgs(parsed, [], configPath);

  log?.info(`Loaded ${esArgs.length} Elasticsearch setting(s) from ${configPath}`);

  return esArgs;
}

/**
 * Loads the checked-in `config/es.yml` file, if present.
 */
export function loadEsConfigEsArgs(
  log?: ToolingLog,
  configPath: string = ES_CONFIG_PATH
): string[] {
  return loadEsYamlEsArgs(configPath, log);
}

/**
 * Loads the optional `config/es.dev.yml` file, if present.
 */
export function loadEsDevConfigEsArgs(
  log?: ToolingLog,
  configPath: string = ES_DEV_CONFIG_PATH
): string[] {
  return loadEsYamlEsArgs(configPath, log);
}
