/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, join } from 'path';
import { globbyMock, readFileMock } from './get_translation_paths.test.mocks';
import { getTranslationPaths } from './get_translation_paths';

describe('getTranslationPaths', () => {
  beforeEach(() => {
    globbyMock.mockReset();
    readFileMock.mockReset();

    globbyMock.mockResolvedValue([]);
    readFileMock.mockResolvedValue('{}');
  });

  it('calls `globby` with the correct parameters', async () => {
    getTranslationPaths({ cwd: '/some/cwd', nested: false });

    expect(globbyMock).toHaveBeenCalledTimes(1);
    expect(globbyMock).toHaveBeenCalledWith('.i18nrc.json', { cwd: '/some/cwd', dot: true });

    globbyMock.mockClear();

    await getTranslationPaths({ cwd: '/other/cwd', nested: true });

    expect(globbyMock).toHaveBeenCalledTimes(1);
    expect(globbyMock).toHaveBeenCalledWith('*/.i18nrc.json', { cwd: '/other/cwd', dot: true });
  });

  it('calls `readFile` for each entry returned by `globby`', async () => {
    const entries = [join('pathA', '.i18nrc.json'), join('pathB', '.i18nrc.json')];
    globbyMock.mockResolvedValue(entries);

    const cwd = '/kibana-extra';

    await getTranslationPaths({ cwd, nested: true });

    expect(readFileMock).toHaveBeenCalledTimes(2);

    expect(readFileMock).toHaveBeenNthCalledWith(1, resolve(cwd, entries[0]), 'utf8');
    expect(readFileMock).toHaveBeenNthCalledWith(2, resolve(cwd, entries[1]), 'utf8');
  });

  it('returns the absolute path to the translation files', async () => {
    const entries = ['.i18nrc.json'];
    globbyMock.mockResolvedValue(entries);

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
    globbyMock.mockResolvedValue(['.i18nrc.json']);
    readFileMock.mockRejectedValue(new Error('error parsing file'));

    await expect(
      getTranslationPaths({ cwd: '/cwd', nested: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to parse .i18nrc.json file at /cwd/.i18nrc.json"`
    );
  });
});
