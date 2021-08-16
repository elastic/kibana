/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';

export const readMeta = (file: string) => {
  try {
    const meta = fs.readFileSync(`${file}.meta`, {
      encoding: 'utf8',
    });

    return {
      exists: fs.existsSync(file),
      ...JSON.parse(meta),
    };
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    return {
      exists: false,
    };
  }
};

export const writeMeta = (file: string, details = {}) => {
  const meta = {
    ts: new Date(),
    ...details,
  };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.meta`, JSON.stringify(meta, null, 2));
};
