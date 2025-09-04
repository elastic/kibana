/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';

const mockFs = fs as jest.Mocked<typeof fs>;

export interface FileSystemScenario {
  rootPackageJson: any;
  tsconfigFiles: Record<string, string>;
  existingFiles?: string[];
}

export function setupFileSystemMocks(scenario: FileSystemScenario) {
  mockFs.readFileSync.mockImplementation((filePath) => {
    if (filePath === 'package.json') {
      return JSON.stringify(scenario.rootPackageJson);
    }

    if (typeof filePath === 'string' && filePath.includes('tsconfig.json')) {
      for (const [packageName, content] of Object.entries(scenario.tsconfigFiles)) {
        if (filePath.includes(packageName)) {
          return content;
        }
      }
    }
    return '{}';
  });

  if (scenario.existingFiles) {
    mockFs.existsSync.mockImplementation((filePath) => {
      if (typeof filePath === 'string') {
        return scenario.existingFiles!.some((existingFile) => filePath.includes(existingFile));
      }
      return true;
    });
  } else {
    mockFs.existsSync.mockReturnValue(true);
  }
}
