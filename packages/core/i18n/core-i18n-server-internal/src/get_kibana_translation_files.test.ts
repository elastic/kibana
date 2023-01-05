/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getKibanaTranslationFiles } from './get_kibana_translation_files';
import { getTranslationPaths } from './get_translation_paths';

const mockGetTranslationPaths = getTranslationPaths as jest.Mock;

jest.mock('./get_translation_paths', () => ({
  getTranslationPaths: jest.fn().mockResolvedValue([]),
}));
jest.mock('@kbn/repo-info', () => ({
  fromRoot: jest.fn().mockImplementation((path: string) => path),
}));

const locale = 'en';

describe('getKibanaTranslationPaths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getTranslationPaths against kibana root and kibana-extra', async () => {
    await getKibanaTranslationFiles(locale, []);

    expect(mockGetTranslationPaths).toHaveBeenCalledTimes(2);

    expect(mockGetTranslationPaths).toHaveBeenCalledWith({
      cwd: '.',
      nested: true,
    });

    expect(mockGetTranslationPaths).toHaveBeenCalledWith({
      cwd: '../kibana-extra',
      nested: true,
    });
  });

  it('calls getTranslationPaths for each config returned in plugin.paths', async () => {
    const pluginPaths = ['/path/to/pluginA', '/path/to/pluginB'];

    await getKibanaTranslationFiles(locale, pluginPaths);

    expect(mockGetTranslationPaths).toHaveBeenCalledTimes(2 + pluginPaths.length);

    pluginPaths.forEach((pluginPath) => {
      expect(mockGetTranslationPaths).toHaveBeenCalledWith({
        cwd: pluginPath,
        nested: false,
      });
    });
  });

  it('only return files for specified locale', async () => {
    mockGetTranslationPaths.mockResolvedValueOnce(['/root/en.json', '/root/fr.json']);
    mockGetTranslationPaths.mockResolvedValueOnce([
      '/kibana-extra/en.json',
      '/kibana-extra/fr.json',
    ]);

    const translationFiles = await getKibanaTranslationFiles('en', []);

    expect(translationFiles).toEqual(['/root/en.json', '/kibana-extra/en.json']);
  });
});
