/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { getConfigFromFiles } from '@kbn/config';
import type { ConfigValue } from './format';
import { flattenConfig, formatValue, sortRows } from './format';
import type { SettingRow, SettingsList, SettingsProvider } from './types';

/** A Kibana setting and its schema type, as `ConfigService.listAllSettings()` reports it. */
export interface KibanaSettingType {
  readonly setting: string;
  readonly type: string;
}

// Kibana CLI options that set a setting without naming it.
const OPTION_SETTINGS: Readonly<Record<string, string>> = {
  '--port': 'server.port',
  '-p': 'server.port',
  '--host': 'server.host',
  '-H': 'server.host',
  '--elasticsearch': 'elasticsearch.hosts',
  '-e': 'elasticsearch.hosts',
};
const CONFIG_OPTIONS = new Set(['--config', '-c']);

interface ParsedArgs {
  readonly configFiles: readonly string[];
  readonly settings: ReadonlyArray<[string, ConfigValue]>;
  readonly loadsDevConfig: boolean;
}

/** Reads the settings and config files out of Kibana CLI arguments, like `--xpack.fleet.enabled=false`. */
export const parseKibanaArgs = (args: readonly string[]): ParsedArgs => {
  const configFiles: string[] = [];
  const settings: Array<[string, ConfigValue]> = [];
  let loadsDevConfig = true;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--no-dev-config') {
      loadsDevConfig = false;
      continue;
    }
    const [name, inlineValue] = arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const next = args[index + 1];
    const takesNext = inlineValue === undefined && next !== undefined && !next.startsWith('-');
    const value = inlineValue ?? (takesNext ? next : undefined);
    if (takesNext) {
      index++;
    }
    if (CONFIG_OPTIONS.has(name) && value !== undefined) {
      configFiles.push(value);
    } else if (OPTION_SETTINGS[name] && value !== undefined) {
      settings.push([OPTION_SETTINGS[name], value]);
    } else if (name.startsWith('--') && name.includes('.')) {
      settings.push([name.slice(2), value ?? true]);
    }
  }
  return { configFiles, settings, loadsDevConfig };
};

export interface KibanaSettingsOptions {
  readonly repoRoot: string;
  readonly kibanaArgs: readonly string[];
  /** Where the list of every Kibana setting is cached, per commit. */
  readonly cacheDir: string;
}

/** The settings from the config files Kibana loads in --dev mode and from its CLI arguments, later ones winning. */
export const getKibanaCurrentSettings = ({
  repoRoot,
  kibanaArgs,
}: KibanaSettingsOptions): SettingsList => {
  const { configFiles, settings, loadsDevConfig } = parseKibanaArgs(kibanaArgs);
  const configDir = path.join(repoRoot, 'config');
  const files = [
    ...(configFiles.length > 0
      ? configFiles.map((file) => path.resolve(repoRoot, file))
      : [path.join(configDir, 'kibana.yml')]),
    ...(loadsDevConfig ? [path.join(configDir, 'kibana.dev.yml')] : []),
  ].filter((file) => fs.existsSync(file));

  const byKey = new Map<string, SettingRow>();
  const add = (entries: ReadonlyArray<[string, ConfigValue]>, source: string) => {
    for (const [key, value] of entries) {
      byKey.set(key, { key, value: formatValue(key, value), source });
    }
  };
  for (const file of files) {
    add(flattenConfig(getConfigFromFiles([file])), path.relative(repoRoot, file));
  }
  add(settings, 'flag');

  return {
    rows: sortRows([...byKey.values()]),
    notes: [
      `From ${[...files.map((file) => path.relative(repoRoot, file)), 'flags'].join(', ')}.`,
      '--dev also sets development defaults, such as elasticsearch.username and password.',
    ],
  };
};

const getCommit = async (repoRoot: string): Promise<string> => {
  try {
    const { stdout } = await promisify(execFile)('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
};

/** Lists every Kibana setting in a child process, as it boots Kibana's plugins; cached per commit. */
const listKibanaSettings = async (
  repoRoot: string,
  cacheDir: string
): Promise<readonly KibanaSettingType[]> => {
  const cacheFile = path.join(cacheDir, `kibana_settings.${await getCommit(repoRoot)}.json`);
  if (!fs.existsSync(cacheFile)) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'dev'), 'kibana-settings', '--out', cacheFile],
        { cwd: repoRoot, stdio: 'ignore' }
      );
      child.on('error', reject);
      child.on('close', (code) =>
        code === 0 && fs.existsSync(cacheFile)
          ? resolve()
          : reject(new Error(`listing Kibana settings failed with code ${code}`))
      );
    });
  }
  return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
};

export const createKibanaSettingsProvider = (options: KibanaSettingsOptions): SettingsProvider => ({
  loadingHint: {
    available:
      "Listing every Kibana setting boots Kibana's plugins; the first time per commit takes about 20s",
  },
  current: async () => getKibanaCurrentSettings(options),
  available: async () => {
    const current = new Map(getKibanaCurrentSettings(options).rows.map((row) => [row.key, row]));
    const settings = await listKibanaSettings(options.repoRoot, options.cacheDir);
    return {
      rows: sortRows(
        settings.map(({ setting, type }) => ({
          ...current.get(setting),
          key: setting,
          detail: type.replace(/\?/g, ''),
        }))
      ),
      notes: [
        `${settings.length} settings from the config schemas of every plugin; ● marks the ones you set.`,
      ],
    };
  },
});
