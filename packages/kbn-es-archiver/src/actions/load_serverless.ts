/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one * or more contributor license agreements. Licensed under the Elastic License * 2.0 and the Server Side Public License, v 1; you may not use this file except * in compliance with, at your election, the Elastic License 2.0 or the Server * Side Public License, v 1. */
// import { Observable } from 'rxjs/Observable';
// import 'rxjs/add/observable/of';
// import 'rxjs/add/observable/from';
// import oboe from 'oboe/dist/oboe-node';
// import { createReadStream } from 'fs';
// import readline from 'readline';
import { pipe } from 'fp-ts/function';
import { from } from 'rxjs';
import { prioritizeMappings, readDirectory } from '../lib';
// import jsonStream from '../../../../src/dev/code_coverage/ingest_coverage/json_stream';
// import { noop } from '../../../../src/dev/code_coverage/ingest_coverage/utils';
// export const lineRead = (x) => readline.createInterface({ input: createReadStream(x) });
//
// export const maybeMappingsAndArchive$ = () => {};
//
// const json$ = (x) => oboe(createReadStream(x));
//
// const objStream = (x) => json$(x).on('done', noop);
const handleMappings = (x) => {
  console.log(`\nλjs will handle mappings: \n\t${x}`);
};
const handleArchive = (x) => {
  console.log(`\nλjs will handle archive: \n\t${x}`);
};
import { readdir } from 'fs/promises';
import { PathLike } from 'fs';

type PredicateFunction = (a: string) => boolean;
const doesNotStartWithADot: PredicateFunction = (x) => !x.startsWith('.');
const readDirectory = (predicate: PredicateFunction) => {
  return async (path: string) => (await readdir(path)).filter(predicate);
};

const mappingsAndArchiveFileNamesMaybeZipped = readDirectory(doesNotStartWithADot);

// TODO-TRE: So, all this just gives me the names.
// So, next I've to create indexes using as much of the old code as possible.
// Then, I've to impl createParseArchiveStreams()
//   Seems like all I need to is to maybe gunzip, then pipe-map over to build the json fragment
//   Building the json fragment seems like a pita.
//   I reckon oboe just might come in handy, instead of 4 different native node streams to build the
//     json stanza
export const begin = async (archivePath: PathLike | string) => {
  // of will give me them both on next, as an array, basically a tuple of two strings, the names of the files
  // of(prioritizeMappings(await readDirectory(archivePath))).subscribe({

  // TODO-TRE: Make sure to handle gzipped mappings files too, not just gzipped archives
  from(
    pipe(await mappingsAndArchiveFileNamesMaybeZipped(archivePath as string), prioritizeMappings)
  )
    // .pipe

    // tap((x) => {
    //   console.log(`\nλjs x: \n\t${x}`);
    // })

    // ()

    .subscribe({
      // next: (mappingsOrArchive) =>
      //   mappingsOrArchive === 'mappings.json'
      //     ? handleMappings(mappingsOrArchive)
      //     : handleArchive(mappingsOrArchive),
      next: (x) => console.log(`\nλjs next - x: \n\t${x}`),
      error: (err) => console.log('error:', err),
      complete: () => console.log('the end'),
    });
};
