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

function readFile(file: string) {
  return new Promise<string>((resolve, reject) =>
    fs.readFile(file, 'utf8', (err, content) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    })
  );
}

export function detectLanguageByFilename(filename: string) {
  const lang = detect.filename(filename);
  return lang && lang.toLowerCase();
}

export async function detectLanguage(file: string, fileContent?: Buffer | string) {
  let lang = detect.filename(file);
  if (!lang) {
    let content: string;
    if (fileContent) {
      content = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf8');
    } else {
      content = await readFile(file);
    }
    lang = detect.contents(file, content);
    return lang ? lang.toLowerCase() : null;
  } else {
    return Promise.resolve(lang.toLowerCase());
  }
}
