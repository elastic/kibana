/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createWriteStream, unlinkSync } from 'fs';
import https from 'https';

export function downloadFile(url: string, outputPath: string) {
  const file = createWriteStream(outputPath);

  return new Promise((res, rej) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          rej(response.statusMessage);
        } else {
          response.pipe(file);

          file.on('finish', () => {
            file.close();
            res(undefined);
          });
        }
      })
      .on('error', (err) => {
        unlinkSync(outputPath);
        rej(err);
      });
  });
}
