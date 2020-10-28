/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { I18N_RC } from './constants';
import { fromRoot } from '../../../core/server/utils';

jest.mock('./get_translation_paths', () => ({ getTranslationPaths: jest.fn() }));
import { getKibanaTranslationPaths } from './get_kibana_translation_paths';
import { getTranslationPaths as mockGetTranslationPaths } from './get_translation_paths';

describe('getKibanaTranslationPaths', () => {
  const mockConfig = { get: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls getTranslationPaths against kibana root and kibana-extra', async () => {
    mockConfig.get.mockReturnValue([]);
    await getKibanaTranslationPaths(mockConfig);
    expect(mockGetTranslationPaths).toHaveBeenNthCalledWith(1, {
      cwd: fromRoot('.'),
      glob: `*/${I18N_RC}`,
    });

    expect(mockGetTranslationPaths).toHaveBeenNthCalledWith(2, {
      cwd: fromRoot('../kibana-extra'),
      glob: `*/${I18N_RC}`,
    });
  });

  it('calls getTranslationPaths for each config returned in plugin.paths and plugins.scanDirs', async () => {
    mockConfig.get.mockReturnValueOnce(['a', 'b']).mockReturnValueOnce(['c']);
    await getKibanaTranslationPaths(mockConfig);
    expect(mockConfig.get).toHaveBeenNthCalledWith(1, 'plugins.paths');
    expect(mockConfig.get).toHaveBeenNthCalledWith(2, 'plugins.scanDirs');

    expect(mockGetTranslationPaths).toHaveBeenNthCalledWith(2, { cwd: 'a', glob: I18N_RC });
    expect(mockGetTranslationPaths).toHaveBeenNthCalledWith(3, { cwd: 'b', glob: I18N_RC });
    expect(mockGetTranslationPaths).toHaveBeenNthCalledWith(4, { cwd: 'c', glob: `*/${I18N_RC}` });
  });
});
