/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

export const getLocalesFromFiles = (filePaths: string[]) => {
  const localesMap = new Map<string, string>();
  for (const filePath of filePaths) {
    const locale = getLocaleFromFile(filePath);
    if (localesMap.has(locale)) {
      throw new Error(`Locale file ${locale} already exists in ${filePath}`);
    }

    localesMap.set(locale, filePath);
  }

  return localesMap;
};

export const getLocaleFromFile = (filePath: string): string => {
  const { name } = path.parse(filePath);

  return name;
};
