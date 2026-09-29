/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Os from 'os';
import Path from 'path';

import { MANAGED_EXTENSIONS_KEYS } from '@kbn/managed-vscode-config';

import { updateConfigFile } from './update_config_file';

const [{ value: MANAGED_RECOMMENDATIONS }] = MANAGED_EXTENSIONS_KEYS;

// VSCode config files are JSONC; the values used here never contain comment markers
const parseJsonc = (content: string) =>
  JSON.parse(content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));

let tmpDir: string;
let path: string;

beforeEach(async () => {
  tmpDir = await Fsp.mkdtemp(Path.join(Os.tmpdir(), 'kbn-managed-vscode-config-'));
  path = Path.join(tmpDir, 'extensions.json');
});

afterEach(async () => {
  await Fsp.rm(tmpDir, { recursive: true, force: true });
});

const update = async () => {
  await updateConfigFile(path, MANAGED_EXTENSIONS_KEYS);
  return await Fsp.readFile(path, 'utf-8');
};

it('creates extensions.json with the managed recommendations when it does not exist', async () => {
  const content = await update();

  expect(content).toMatch(/\/\/ @managed\s+"recommendations"/);
  expect(parseJsonc(content)).toEqual({ recommendations: MANAGED_RECOMMENDATIONS });
});

it('keeps self managed recommendations and unrelated keys across repeat runs', async () => {
  await Fsp.writeFile(
    path,
    `{
  // self managed
  "recommendations": ["my.extension"],
  "unwantedRecommendations": ["some.extension"]
}
`
  );

  const first = await update();

  expect(first).toMatch(/\/\/ self managed\s+"recommendations"/);
  expect(parseJsonc(first)).toEqual({
    recommendations: ['my.extension'],
    unwantedRecommendations: ['some.extension'],
  });
  expect(await update()).toBe(first);
});

it('refreshes managed recommendations without touching unrelated keys across repeat runs', async () => {
  await Fsp.writeFile(
    path,
    `{
  // @managed
  "recommendations": ["stale.extension"],
  "unwantedRecommendations": ["some.extension"]
}
`
  );

  const first = await update();

  expect(parseJsonc(first)).toEqual({
    recommendations: MANAGED_RECOMMENDATIONS,
    unwantedRecommendations: ['some.extension'],
  });
  expect(await update()).toBe(first);
});

it('leaves a file marked self managed at the top untouched', async () => {
  const original = `// self managed
{
  "recommendations": ["my.extension"]
}
`;
  await Fsp.writeFile(path, original);

  expect(await update()).toBe(original);
});
