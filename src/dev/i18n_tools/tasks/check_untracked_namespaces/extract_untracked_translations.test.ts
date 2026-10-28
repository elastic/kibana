/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { ErrorReporter } from '../../utils';
import type { I18nConfig } from '../../types';
import {
  extractUntrackedMessages,
  getIgnorePatternsForRoot,
  isRootIgnored,
  reportUntrackedExtraction,
  REGISTRATION_HINT,
} from './extract_untracked_translations';

const fixtureRoot = path.resolve(__dirname, '..', '..', '__fixtures__', 'untracked_namespaces');

const config: I18nConfig = {
  paths: { registered: [path.join(fixtureRoot, 'registered')] },
  exclude: [path.join(fixtureRoot, 'excluded')],
  translations: [],
};

const ignoredDirs = [...Object.values(config.paths).flat(), ...config.exclude];

const collectExtractions = async (rootPath: string, dirs: string[]) => {
  const extractions = [];
  for await (const extraction of extractUntrackedMessages(rootPath, dirs)) {
    extractions.push(extraction);
  }
  return extractions;
};

const relativeTo = (filePath: string) => path.relative(fixtureRoot, filePath);

describe('getIgnorePatternsForRoot', () => {
  it('turns directories under the root into relative glob patterns', () => {
    expect(getIgnorePatternsForRoot(fixtureRoot, ignoredDirs)).toEqual([
      'registered/**',
      'excluded/**',
    ]);
  });

  it('drops directories outside the root', () => {
    expect(getIgnorePatternsForRoot(path.join(fixtureRoot, 'untracked'), ignoredDirs)).toEqual([]);
  });
});

describe('isRootIgnored', () => {
  it('is true for a root equal to or inside an ignored directory', () => {
    expect(isRootIgnored(path.join(fixtureRoot, 'registered'), ignoredDirs)).toBe(true);
    expect(isRootIgnored(path.join(fixtureRoot, 'excluded', 'nested'), ignoredDirs)).toBe(true);
  });

  it('is false for a root outside every ignored directory', () => {
    expect(isRootIgnored(fixtureRoot, ignoredDirs)).toBe(false);
    expect(isRootIgnored(path.join(fixtureRoot, 'registered-sibling'), ignoredDirs)).toBe(false);
  });
});

describe('extractUntrackedMessages', () => {
  it('yields nothing when the root itself is registered or excluded', async () => {
    expect(await collectExtractions(path.join(fixtureRoot, 'registered'), ignoredDirs)).toEqual([]);
    expect(await collectExtractions(path.join(fixtureRoot, 'excluded'), ignoredDirs)).toEqual([]);
  });

  it('skips files under registered and excluded paths and reports the rest', async () => {
    const extractions = await collectExtractions(fixtureRoot, ignoredDirs);

    expect(
      extractions.map(({ untrackedFilePath }) => relativeTo(untrackedFilePath)).sort()
    ).toEqual(['untracked/plain.ts', 'untracked/unparsable.ts', 'untracked/untracked.ts']);
  });

  it('scans registered paths when no directories are ignored', async () => {
    const extractions = await collectExtractions(fixtureRoot, []);

    expect(extractions.map(({ untrackedFilePath }) => relativeTo(untrackedFilePath))).toEqual(
      expect.arrayContaining(['registered/registered.ts', 'excluded/excluded.ts'])
    );
  });

  it('captures parse errors per file instead of throwing', async () => {
    const extractions = await collectExtractions(fixtureRoot, ignoredDirs);
    const byFile = Object.fromEntries(
      extractions.map((extraction) => [relativeTo(extraction.untrackedFilePath), extraction])
    );

    expect(byFile['untracked/unparsable.ts'].parseError?.message).toMatch(
      /Error parsing file .*unparsable\.ts/
    );
    expect(byFile['untracked/unparsable.ts'].extractedMessages.size).toBe(0);
    expect([...byFile['untracked/untracked.ts'].extractedMessages.keys()]).toEqual([
      'untracked.first',
      'untracked.second',
    ]);
    expect(byFile['untracked/untracked.ts'].parseError).toBeUndefined();
    expect(byFile['untracked/plain.ts'].extractedMessages.size).toBe(0);
  });
});

describe('reportUntrackedExtraction', () => {
  it('reports untracked files and parse errors together without throwing', async () => {
    const errorReporter = new ErrorReporter({ name: 'Untracked Translations' });
    const extractions = await collectExtractions(fixtureRoot, ignoredDirs);

    extractions.forEach((extraction) => reportUntrackedExtraction(errorReporter, extraction));

    expect(errorReporter.errors).toHaveLength(2);
    const joined = errorReporter.errors.join('\n');
    expect(joined).toMatch(/Error parsing file .*unparsable\.ts/);
    expect(joined).toMatch(
      /untracked\.ts contains 2 i18n message id\(s\) outside every registered namespace path: untracked\.first, untracked\.second\./
    );
    expect(joined).toContain(REGISTRATION_HINT);
    expect(joined).not.toContain('plain.ts');
  });
});
