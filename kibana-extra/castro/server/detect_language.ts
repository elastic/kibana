/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fs from 'fs';
// @ts-ignore
import * as detect from 'language-detect';

// patch the lib
detect.extensions['.ts'] = 'typescript';
detect.extensions['.tsx'] = 'typescript';

export function detectLanguage(file: string) {
  const lang = detect.filename(file);
  if (!lang) {
    return new Promise((resolve, reject) =>
      fs.readFile(file, 'utf8', (err, content) => {
        if (err) {
          reject(err);
        } else {
          const result = detect.contents(file, content);
          resolve(result);
        }
      })
    );
  } else {
    return Promise.resolve(lang);
  }
}
