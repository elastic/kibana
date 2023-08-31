/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from } from 'rxjs';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { map } from 'rxjs/operators';

const toStr = (x: any) => `${x}`;
const begin = async (archivePath: fs.PathLike) => {
  from(fs.createReadStream(archivePath).pipe(zlib.createGunzip()))
    .pipe(map(toStr))
    .subscribe({
      next: (x) => console.log('\nλjs next, x:', x),
      error: (err) => console.log('error:', err),
      complete: () => console.log('the end'),
    });
};

const archivePath =
  '/Users/trezworkbox/dev/scratches/src/js/streams/native-nodejs-streams/gunzip/someotherfile.txt.gz';

begin(archivePath);
