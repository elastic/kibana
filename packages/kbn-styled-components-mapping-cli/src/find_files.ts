/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const SOURCE_DIRS = ['x-pack', 'src'];
const SOURCE_FILE_REGEX = /(^.?|\.[^d]|[^.]d|[^.][^d])\.tsx?$/;
const STYLED_COMPONENTS_IMPORT_REGEX =
  /import\s+(?:{[^{}]+}|.*?)\s*(?:from)?\s*['"](styled-components)['"]/;
const EMOTION_STYLED_IMPORT_REGEX =
  /import\s+(?:{[^{}]+}|.*?)\s*(?:from)?\s*['"](@emotion\/styled)['"]/;

export interface Meta {
  path: string;
  usesStyledComponents: boolean;
  usesOnlyStyledComponents?: boolean;
  files?: Meta[];
}

const walkDirectory = async (dirPath: string): Promise<Meta> => {
  const files: Meta[] = [];
  let usesStyledComponents = false;
  let usesOnlyStyledComponents = true;

  for (const file of await fs.readdir(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(file.path, file.name);

    if (file.isDirectory()) {
      const meta = await walkDirectory(fullPath);
      if (meta.usesStyledComponents) {
        usesStyledComponents = true;
      }
      if (usesOnlyStyledComponents && !meta.usesOnlyStyledComponents) {
        usesOnlyStyledComponents = false;
      }
      files.push(meta);
      continue;
    }

    if (!SOURCE_FILE_REGEX.test(file.name) || !file.isFile()) {
      continue;
    }

    const meta: Meta = {
      path: fullPath,
      usesStyledComponents: false,
    };

    const contents = await fs.readFile(fullPath, 'utf8');
    const usesEmotionStyled = EMOTION_STYLED_IMPORT_REGEX.test(contents);
    meta.usesStyledComponents = STYLED_COMPONENTS_IMPORT_REGEX.test(contents);

    if (usesEmotionStyled) {
      usesOnlyStyledComponents = false;
    }

    if (usesEmotionStyled || meta.usesStyledComponents) {
      files.push(meta);
    }
  }

  return {
    path: dirPath,
    files,
    usesStyledComponents,
    usesOnlyStyledComponents: usesStyledComponents && usesOnlyStyledComponents,
  };
};

export const findFiles = async (rootDirPath: string) => {
  return Promise.all(SOURCE_DIRS.map((dir) => walkDirectory(path.join(rootDirPath, dir))));
};
