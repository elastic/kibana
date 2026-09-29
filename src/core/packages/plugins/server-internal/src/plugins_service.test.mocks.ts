/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';

const realFs = require('fs');
const kibanaPackagePath = resolve(REPO_ROOT, 'package.json');

export const mockPackage = {
  raw: { __dirname: '/tmp', name: 'kibana' } as any,
};

vi.doMock('fs', () => {
      const mocked = {
      ...realFs,
      readFileSync: (filePath: string, options?: unknown) => {
        if (filePath === kibanaPackagePath) {
          return JSON.stringify(mockPackage.raw);
        }
        return realFs.readFileSync(filePath, options);
      },
    };
      return { ...mocked, default: mocked };
    });

export const mockDiscover = vi.fn();
vi.mock('./discovery/plugins_discovery', () => {
      const mocked = { discover: mockDiscover };
      return { ...mocked, default: mocked };
    });

vi.mock('./plugins_system');
