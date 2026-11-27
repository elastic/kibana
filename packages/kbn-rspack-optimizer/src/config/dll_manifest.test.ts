/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import { loadDllManifest } from './dll_manifest';

const readFileSyncMock = jest.spyOn(Fs, 'readFileSync');
const manifest = {
  name: '__kbnSharedDeps_npm__',
  content: {
    './node_modules/react/index.js': {
      buildMeta: {
        exportsType: 'default',
        defaultObject: 'redirect',
      },
      id: 42,
    },
  },
};

describe('loadDllManifest', () => {
  beforeEach(() => {
    readFileSyncMock.mockClear();
    readFileSyncMock.mockReturnValue(JSON.stringify(manifest));
  });

  afterAll(() => {
    readFileSyncMock.mockRestore();
  });

  it('does not require a prebuilt manifest until called', () => {
    expect(readFileSyncMock).not.toHaveBeenCalled();

    loadDllManifest();

    expect(readFileSyncMock).toHaveBeenCalledWith(UiSharedDepsNpm.dllManifestPath, 'utf8');
  });

  it('returns the Rspack manifest without compatibility transformations', () => {
    expect(loadDllManifest()).toEqual(manifest);
  });
});
