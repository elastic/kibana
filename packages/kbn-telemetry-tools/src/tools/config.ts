/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as path from 'path';
import { TELEMETRY_RC } from './constants';
import { readFile } from 'fs/promises';

export interface TelemetryRC {
  root: string;
  output: string;
  exclude: string[];
}

export async function readRcFile(rcRoot: string) {
  if (!path.isAbsolute(rcRoot)) {
    throw Error(`config root (${rcRoot}) must be an absolute path.`);
  }

  const rcFile = path.resolve(rcRoot, TELEMETRY_RC);
  const configString = await readFile(rcFile, 'utf8');
  return JSON.parse(configString);
}

export async function parseTelemetryRC(rcRoot: string): Promise<TelemetryRC[]> {
  const parsedRc = await readRcFile(rcRoot);
  const configs = Array.isArray(parsedRc) ? parsedRc : [parsedRc];
  return configs.map(({ root, output, exclude = [] }) => {
    if (typeof root !== 'string') {
      throw Error('config.root must be a string.');
    }
    if (typeof output !== 'string') {
      throw Error('config.output must be a string.');
    }
    if (!Array.isArray(exclude)) {
      throw Error('config.exclude must be an array of strings.');
    }

    return {
      root: path.join(rcRoot, root),
      output: path.join(rcRoot, output),
      exclude: exclude.map((excludedPath) => path.resolve(rcRoot, excludedPath)),
    };
  });
}
