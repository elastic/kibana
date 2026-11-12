/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';
import { esqlCommandRegistry } from '../../commands/registry';
import { PROVIDER_OVERRIDES } from './overrides';

const REGISTRY_DIR = resolve(__dirname, '../../commands/registry');

// The arguments allowed to have a provider override. Adding one needs an owner and an issue.
const ALLOWED_OVERRIDES: readonly string[] = [];

const IMPORT = /(?:from|require\(|import\()\s*['"]([^'"]+)['"]/g;
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1).)*)\1/g;
// The name the grammar gives to the rule of a command.
const COMMAND_RULE_NAME = /^[a-z]\w*Command$/;

const engineFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      return engineFiles(path);
    }

    return /\.(ts|js)$/.test(name) && !/\.test\.(ts|js)$/.test(name) ? [path] : [];
  });

const describeFinding = (file: string, finding: string): string =>
  `${relative(__dirname, file)}: ${finding}`;

// A command's folder is a folder directly under the registry.
const isInCommandFolder = (target: string): boolean => {
  const [folder, ...rest] = relative(REGISTRY_DIR, target).split(sep);

  return !folder.startsWith('..') && rest.length > 0;
};

describe('autocomplete v2 boundary', () => {
  const files = engineFiles(__dirname);
  const commandNames = new Set(esqlCommandRegistry.getAllCommandNames());

  it('imports nothing from the folder of a command', () => {
    const violations = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(IMPORT)]
        .map(([, source]) => source)
        .filter((source) => /^\.\.?(\/|$)/.test(source))
        .filter((source) => isInCommandFolder(resolve(dirname(file), source)))
        .map((source) => describeFinding(file, source))
    );

    expect(violations).toEqual([]);
  });

  it('names no command and no grammar rule of a command', () => {
    const violations = files.flatMap((file) => {
      // Import paths are not names the engine acts on.
      const code = readFileSync(file, 'utf8').replace(IMPORT, '');

      return [...code.matchAll(STRING_LITERAL)]
        .map(([, , text]) => text)
        .filter((text) => commandNames.has(text.toLowerCase()) || COMMAND_RULE_NAME.test(text))
        .map((text) => describeFinding(file, text));
    });

    expect(violations).toEqual([]);
  });

  it('has only the allowlisted provider overrides, each with an owner and an issue', () => {
    expect(Object.keys(PROVIDER_OVERRIDES).sort()).toEqual([...ALLOWED_OVERRIDES].sort());

    for (const { owner, issue, waitingFor } of Object.values(PROVIDER_OVERRIDES)) {
      expect([owner, issue, waitingFor].every((value) => value.length > 0)).toBe(true);
    }
  });
});
