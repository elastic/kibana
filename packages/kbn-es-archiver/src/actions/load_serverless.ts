/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one * or more contributor license agreements. Licensed under the Elastic License * 2.0 and the Server Side Public License, v 1; you may not use this file except * in compliance with, at your election, the Elastic License 2.0 or the Server * Side Public License, v 1. */

// import { Observable } from 'rxjs/Observable';
// import 'rxjs/add/observable/of';
// import 'rxjs/add/observable/from';
// import oboe from 'oboe/dist/oboe-node';
// import { createReadStream } from 'fs';
// import readline from 'readline';

import { from, fromEventPattern } from 'rxjs';
import { map } from 'rxjs/operators';
import * as zlib from 'zlib';
import { readdir } from 'fs/promises';
import * as fs from 'fs';
import oboe from 'oboe';

type PredicateFunction = (a: string) => boolean;
const doesNotStartWithADot: PredicateFunction = (x) => !x.startsWith('.');
const readDirectory = (predicate: PredicateFunction) => {
  return async (path: string) => (await readdir(path)).filter(predicate);
};

// const mappingsAndArchiveFileNamesMaybeZipped = readDirectory(doesNotStartWithADot);
// from(
//   pipe(await mappingsAndArchiveFileNamesMaybeZipped(archivePath as string), prioritizeMappings)
// )

const toStr = (x: BufferSource) => `${x}`;
const subscribeToDecompressionStream = (archivePath: PathLikeOrString) => {
  from(fs.createReadStream(archivePath).pipe(zlib.createGunzip()))
    .pipe(map(toStr))
    .subscribe({
      next: (x) => console.log('\nλjs decompression stream - next, x:', x),
      error: (err) => console.log('error:', err),
      complete: () => console.log('the end'),
    });
};

type PlaceHolder = any;
type PathLikeOrString = fs.PathLike | string;
const jsonStanza$ = (pathToFile: PathLikeOrString) => (_: PlaceHolder) => oboe(fs.createReadStream(pathToFile)).on('done', _);

const subscribeToStreamingJsonStream = (archivePath: PathLikeOrString) => {
  archivePath =
    '/Users/trezworkbox/dev/scratches/src/js/streams/native-nodejs-streams/gunzip/someotherfile.txt';
  console.log(`\nλjs archivePath: \n\t${archivePath}`);

  fromEventPattern(jsonStanza$(archivePath)).subscribe({
    next: (x) => console.log(`\nλjs jsonStanzas stream - next, x: \n${JSON.stringify(x, null, 2)}`),
    error: (err) => console.log('error:', err),
    complete: () => console.log('the end'),
  });
};
export const begin = (archivePath: PathLikeOrString) => {
  archivePath =
    '/Users/trezworkbox/dev/scratches/src/js/streams/native-nodejs-streams/gunzip/someotherfile.txt.gz';

  // subscribeToDecompressionStream(archivePath);
  subscribeToStreamingJsonStream(archivePath);
  // return from(fs.createReadStream(archivePath).pipe(zlib.createGunzip()))
  //   .pipe(map(toStr))
  //   .subscribe({
  //     next: (x) => console.log("\nλjs next, x:", x),
  //     error: (err) => console.log("error:", err),
  //     complete: () => console.log("the end")
  //   });
};
