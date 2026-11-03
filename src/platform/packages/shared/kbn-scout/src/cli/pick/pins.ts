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

const PINS_FILE = Path.resolve(REPO_ROOT, '.scout/pins.json');

export const readPins = (): string[] | undefined =>
  Fs.existsSync(PINS_FILE) ? JSON.parse(Fs.readFileSync(PINS_FILE, 'utf8')).configs : undefined;

export const writePins = (configs: string[]) => {
  Fs.mkdirSync(Path.dirname(PINS_FILE), { recursive: true });
  Fs.writeFileSync(PINS_FILE, `${JSON.stringify({ configs }, null, 2)}\n`);
};
