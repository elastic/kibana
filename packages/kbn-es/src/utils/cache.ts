/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

export const cache = {
  readMeta(path: string) {
    try {
      const meta = Fs.readFileSync(`${path}.meta`, {
        encoding: 'utf8',
      });

      return {
        ...JSON.parse(meta),
      };
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }

      return {};
    }
  },

  writeMeta(path: string, details = {}) {
    const meta = {
      ts: new Date(),
      ...details,
    };

    Fs.mkdirSync(Path.dirname(path), { recursive: true });
    Fs.writeFileSync(`${path}.meta`, JSON.stringify(meta, null, 2));
  },
};
