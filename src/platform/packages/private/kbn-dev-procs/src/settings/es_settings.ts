/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConfigObject } from './format';
import { formatValue, sortRows } from './format';
import type { SettingRow, SettingsEditor, SettingsList, SettingsProvider } from './types';

export interface EsSettingsOptions {
  readonly esUrl: string;
  readonly auth: { readonly username: string; readonly password: string };
  /** Settings changed in the TUI, which Elasticsearch gets as -E flags the next time it starts. */
  readonly overrides: Map<string, string>;
}

const TUI_SOURCE = 'tui, -E';

interface NodesSettingsResponse {
  readonly nodes?: Readonly<Record<string, { readonly settings: ConfigObject }>>;
}

interface ClusterSettingsResponse {
  readonly persistent: ConfigObject;
  readonly transient: ConfigObject;
  readonly defaults?: ConfigObject;
}

const getJson = async <T>({ esUrl, auth }: EsSettingsOptions, pathAndQuery: string): Promise<T> => {
  const authorization = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
    'base64'
  )}`;
  let response: Response;
  try {
    response = await fetch(new URL(pathAndQuery, esUrl), { headers: { authorization } });
  } catch {
    throw new Error(
      `Elasticsearch is not answering at ${esUrl}; its settings show once it is ready`
    );
  }
  if (!response.ok) {
    throw new Error(`Elasticsearch answered ${response.status} for ${pathAndQuery}`);
  }
  return response.json();
};

/** Settings set on the node (elasticsearch.yml and -E flags) and on the cluster, the latter winning. */
const getCurrentRows = async (options: EsSettingsOptions): Promise<readonly SettingRow[]> => {
  const [{ nodes = {} }, cluster] = await Promise.all([
    getJson<NodesSettingsResponse>(options, '/_nodes/_local/settings?flat_settings=true'),
    getJson<ClusterSettingsResponse>(options, '/_cluster/settings?flat_settings=true'),
  ]);
  const byKey = new Map<string, SettingRow>();
  const add = (settings: ConfigObject, source: string) =>
    Object.entries(settings).forEach(([key, value]) =>
      byKey.set(key, { key, value: formatValue(key, value), source })
    );
  Object.values(nodes).forEach(({ settings }) => add(settings, 'node'));
  add(cluster.persistent, 'cluster, persistent');
  add(cluster.transient, 'cluster, transient');
  // Shown as set from the TUI, also before Elasticsearch restarted with them.
  options.overrides.forEach((value, key) =>
    byKey.set(key, { key, value: formatValue(key, value), source: TUI_SOURCE })
  );
  return sortRows([...byKey.values()]);
};

const APPLIES = 'press r on es to restart it with that (this run only)';

/** Keeps changes as -E flags for the next start of Elasticsearch; nothing is written to disk. */
const createEsEditor = ({ overrides }: EsSettingsOptions): SettingsEditor => ({
  set: async ({ key }, input) => {
    const value = input.trim();
    if (value === '') {
      throw new Error('Enter a value, or press u to unset the setting');
    }
    overrides.set(key, value);
    return {
      message: `Elasticsearch gets -E ${key}=${formatValue(key, value)}; ${APPLIES}`,
      needsRestart: true,
    };
  },
  unset: async ({ key, source }) => {
    if (!overrides.has(key)) {
      throw new Error(
        source
          ? `${key} comes from ${source}, not from the TUI, so it cannot be unset here`
          : `${key} is not set`
      );
    }
    overrides.delete(key);
    return { message: `Removed -E ${key}; ${APPLIES}`, needsRestart: true };
  },
});

export const createEsSettingsProvider = (options: EsSettingsOptions): SettingsProvider => ({
  editor: createEsEditor(options),
  current: async (): Promise<SettingsList> => ({
    rows: await getCurrentRows(options),
    notes: ['From elasticsearch.yml and -E flags (node), and the cluster settings API.'],
  }),
  available: async (): Promise<SettingsList> => {
    const [current, { defaults = {}, persistent, transient }] = await Promise.all([
      getCurrentRows(options),
      getJson<ClusterSettingsResponse>(
        options,
        '/_cluster/settings?include_defaults=true&flat_settings=true'
      ),
    ]);
    const byKey = new Map<string, SettingRow>(current.map((row) => [row.key, row]));
    const keys = new Set([
      ...Object.keys(defaults),
      ...Object.keys(persistent),
      ...Object.keys(transient),
      ...byKey.keys(),
    ]);
    const rows = [...keys].map((key) => ({
      ...byKey.get(key),
      key,
      detail: key in defaults ? `default ${formatValue(key, defaults[key])}` : undefined,
    }));
    return {
      rows: sortRows(rows),
      notes: [
        `${rows.length} settings this node knows, with their defaults; ● marks the ones that are set.`,
      ],
    };
  },
});
