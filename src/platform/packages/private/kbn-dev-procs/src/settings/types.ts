/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface SettingRow {
  readonly key: string;
  /** The configured value, masked for secrets; undefined when the setting is not set. */
  readonly value?: string;
  /** Where the value comes from, e.g. kibana.dev.yml or flag. */
  readonly source?: string;
  /** What else is known about the setting, e.g. its type or default. */
  readonly detail?: string;
}

export interface SettingsList {
  readonly rows: readonly SettingRow[];
  readonly notes: readonly string[];
}

/** The settings a process runs with, every setting it supports, and the command-line flags of its start script. */
export type SettingsKind = 'current' | 'available' | 'flags';

export interface SettingsEditResult {
  /** Says where the change went and how it applies. */
  readonly message: string;
  /** Whether the process has to restart before the change applies. */
  readonly needsRestart: boolean;
}

/** Changes the settings of one process. Both methods reject with a message for the user when they cannot. */
export interface SettingsEditor {
  /** Sets `row.key` to what the user typed; `row` carries what is known about the setting, like its type. */
  readonly set: (row: SettingRow, input: string) => Promise<SettingsEditResult>;
  readonly unset: (row: SettingRow) => Promise<SettingsEditResult>;
}

/** Reads the settings of one process: the ones it runs with, and every one it supports. */
export interface SettingsProvider {
  readonly current: () => Promise<SettingsList>;
  readonly available: () => Promise<SettingsList>;
  /** Shown while a list loads, e.g. when it takes a while. */
  readonly loadingHint?: Partial<Record<SettingsKind, string>>;
  readonly editor?: SettingsEditor;
  /** The command-line flags of the start script, and which ones the process runs with. */
  readonly flags?: () => Promise<SettingsList>;
  readonly flagEditor?: SettingsEditor;
}
