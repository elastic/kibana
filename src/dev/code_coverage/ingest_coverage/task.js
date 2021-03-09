/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint new-cap: 0 */
/* eslint no-unused-vars: 0 */

import { pipe } from './utils';

export const Task = (fork) => ({
  fork,
  map: (f) => Task((rej, res) => fork(rej, pipe(f, res))),
  chain: (f) => Task((rej, res) => fork(rej, (x) => f(x).fork(rej, res))),
  fold: (f, g) =>
    Task((rej, res) =>
      fork(
        (x) => f(x).fork(rej, res),
        (x) => g(x).fork(rej, res)
      )
    ),
});

Task.of = (x) => (rej, res) => res(x);
Task.fromPromised = (fn) => (...args) =>
  Task((rej, res) =>
    fn(...args)
      .then(res)
      .catch(rej)
  );
Task.rejected = (x) => Task((rej, res) => rej(x));
