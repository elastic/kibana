/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromEventPattern } from 'rxjs';
import * as fs from 'fs';
import oboe from 'oboe';

const begin = async (archivePath: any) => {
  const obj$ = (x: any) => oboe(fs.createReadStream(x));
  const json$ = (_: any) => obj$(archivePath).on('node', '!.*', _);

  fromEventPattern(json$).subscribe({
    next: (x) => console.log(`\nλjs x: \n${JSON.stringify(x, null, 2)}`),
    error: (err) => console.log('error:', err),
    complete: () => console.log('the end'),
  });
};

const archivePath =
  '/Users/trezworkbox/dev/scratches/src/js/streams/native-nodejs-streams/gunzip/someotherfile.txt';

begin(archivePath);
