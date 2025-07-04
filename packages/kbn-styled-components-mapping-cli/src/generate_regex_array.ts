/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'node:path';
import type { Meta } from './find_files';

export const pathToRegexString = (modulePath: string): string => {
  modulePath = modulePath.replace(/[\\\/]/g, '[\\/\\\\]');

  return `/${modulePath}/`;
};

export const generateRegexStringArray = (files: Meta[], rootDirPath: string): string[] => {
  const array: string[] = [];

  for (const meta of files) {
    if (meta.files) {
      if (meta.usesOnlyStyledComponents) {
        array.push(pathToRegexString(path.relative(rootDirPath, meta.path)));
      } else {
        array.push(...generateRegexStringArray(meta.files, rootDirPath));
      }
    } else if (meta.usesStyledComponents) {
      array.push(pathToRegexString(path.relative(rootDirPath, meta.path)));
    }
  }

  return array;
};
