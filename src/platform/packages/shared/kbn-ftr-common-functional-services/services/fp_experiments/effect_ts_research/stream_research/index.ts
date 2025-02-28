/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Stream, Effect } from 'effect';
export const streamResearch = () => {
  // Creating a stream of numbers from 1 to 5
  const stream = Stream.range(1, 5);

  Effect.runPromise(Stream.runCollect(stream)).then(console.log);
  // { _id: 'Chunk', values: [ 1, 2, 3, 4, 5 ] }
};
