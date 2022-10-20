/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import execa from 'execa';

import { pprof } from './require_pprof';
import { withCpuProfile } from './with_cpu_profile';

export function inspectCpuProfile<T>(callback: () => T): T;

export function inspectCpuProfile<T>(callback: () => any) {
  return withCpuProfile(callback, (profile) => {
    pprof.encode(profile).then((buffer) => {
      const filename = Path.join(Os.tmpdir(), Date.now() + '.pb.gz');
      Fs.writeFile(filename, buffer, (err) => {
        execa('pprof', ['-web', filename]);
      });
    });
  });
}
