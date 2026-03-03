/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve, join } from 'path';
import { getTranslationPaths } from './get_translation_paths';

jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    glob: jest.fn(),
    readFile: jest.fn(),
  };
});

import { glob, readFile } from 'fs/promises';

const globMock = glob as jest.Mock;
const readFileMock = readFile as jest.Mock;

describe('getTranslationPaths', () => {
  beforeEach(() => {
    globMock.mockReset();
    readFileMock.mockReset();

    readFileMock.mockResolvedValue('{}');
  });

  it('calls `glob` with the correct parameters', async () => {
    const emptyIterator = {
      async *[Symbol.asyncIterator]() {},
    };
    globMock.mockReturnValue(emptyIterator);

    await getTranslationPaths({ cwd: '/some/cwd', nested: false });

    expect(globMock).toHaveBeenCalledTimes(1);
    expect(globMock).toHaveBeenCalledWith('.i18nrc.json', { cwd: '/some/cwd' });

    globMock.mockClear();

    await getTranslationPaths({ cwd: '/other/cwd', nested: true });

    expect(globMock).toHaveBeenCalledTimes(1);
    expect(globMock).toHaveBeenCalledWith('*/.i18nrc.json', { cwd: '/other/cwd' });
  });

  it('calls `readFile` for each entry returned by `glob`', async () => {
    const entries = [join('pathA', '.i18nrc.json'), join('pathB', '.i18nrc.json')];
    const entriesIterator = {
      async *[Symbol.asyncIterator]() {
        for (const entry of entries) {
          yield entry;
        }
      },
    };
    globMock.mockReturnValue(entriesIterator);

    const cwd = '/kibana-extra';

    await getTranslationPaths({ cwd, nested: true });

    expect(readFileMock).toHaveBeenCalledTimes(2);

    expect(readFileMock).toHaveBeenNthCalledWith(1, resolve(cwd, entries[0]), 'utf8');
    expect(readFileMock).toHaveBeenNthCalledWith(2, resolve(cwd, entries[1]), 'utf8');
  });

  it('returns the absolute path to the translation files', async () => {
    const entries = ['.i18nrc.json'];
    const entriesIterator = {
      async *[Symbol.asyncIterator]() {
        for (const entry of entries) {
          yield entry;
        }
      },
    };
    globMock.mockReturnValue(entriesIterator);

    const i18nFileContent = {
      translations: ['translations/en.json', 'translations/fr.json'],
    };
    readFileMock.mockResolvedValue(JSON.stringify(i18nFileContent));

    const cwd = '/cwd';

    const translationPaths = await getTranslationPaths({ cwd, nested: true });

    expect(translationPaths).toEqual([
      resolve(cwd, 'translations/en.json'),
      resolve(cwd, 'translations/fr.json'),
    ]);
  });

  it('throws if i18nrc parsing fails', async () => {
    const entriesIterator = {
      async *[Symbol.asyncIterator]() {
        yield '.i18nrc.json';
      },
    };
    globMock.mockReturnValue(entriesIterator);

    readFileMock.mockRejectedValue(new Error('error parsing file'));

    await expect(
      getTranslationPaths({ cwd: '/cwd', nested: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to parse .i18nrc.json file at /cwd/.i18nrc.json"`
    );
  });
});
