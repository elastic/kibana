/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createWriteStream } from 'fs';
import type { CpuProfile } from './types';

/**
 * Write profile in a streaming manner to prevent issues with large profiles
 */
export async function writeProfile(path: string, profile: CpuProfile): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(path, { encoding: 'utf8' });

    ws.on('error', (error) => {
      reject(error);
    });
    ws.on('finish', () => {
      resolve();
    });

    ws.write('{');
    ws.write('"nodes":[');

    profile.nodes.forEach((n, i) => {
      if (i > 0) {
        ws.write(',');
      }
      ws.write(JSON.stringify(n));
    });

    ws.write('],');
    ws.write('"samples":[');

    profile.samples.forEach((s, i) => {
      if (i > 0) {
        ws.write(',');
      }

      ws.write(String(s));
    });

    ws.write('],');
    ws.write('"timeDeltas":[');

    profile.timeDeltas.forEach((d, i) => {
      if (i > 0) {
        ws.write(',');
      }

      ws.write(String(d));
    });

    if (typeof profile.startTime === 'number') {
      ws.write(`],"startTime":${profile.startTime}`);
    } else {
      ws.write('],"startTime":0');
    }

    if (typeof profile.endTime === 'number') {
      ws.write(`,"endTime":${profile.endTime}`);
    } else {
      ws.write(',"endTime":0');
    }

    if (typeof profile.title === 'string') {
      ws.write(`,"title":${JSON.stringify(profile.title)}`);
    }

    ws.write('}');
    ws.end();
  });
}
