/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { PickableConfig } from './configs';

const STATE_FILE = Path.resolve(REPO_ROOT, '.scout/pins.json');

/** What the picker needs to run a config without loading all Scout configs */
export type PinnedConfig = Pick<PickableConfig, 'path' | 'label' | 'configSet' | 'targets'>;

export interface LastRun {
  config: PinnedConfig;
  specs: string[];
  target: string;
}

export interface PickState {
  pins?: PinnedConfig[];
  last?: LastRun;
  verbose?: boolean;
}

export const toPinned = ({ path, label, configSet, targets }: PinnedConfig): PinnedConfig => ({
  path,
  label,
  configSet,
  targets,
});

export const readState = (): PickState =>
  Fs.existsSync(STATE_FILE) ? JSON.parse(Fs.readFileSync(STATE_FILE, 'utf8')) : {};

export const updateState = (changes: PickState) => {
  Fs.mkdirSync(Path.dirname(STATE_FILE), { recursive: true });
  Fs.writeFileSync(STATE_FILE, `${JSON.stringify({ ...readState(), ...changes }, null, 2)}\n`);
};
