/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as T from 'fp-ts/lib/Task';
import { sequenceT } from 'fp-ts/lib/Apply';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/function';

import { sequenceTExperiment } from './async-sequence-t';

export const runExperiments = () => {
  // e1();
  // e2();
  sequenceTExperiment();
};

const e1 = () => {
  pipe(
    sequenceT(T.task)(T.of(42), T.of('tim')), // [F[A], F[B]] => F[A, B]
    T.map(([answer, name]) =>
      console.log(`Hello ${name}! The answer you're looking for is ${answer}`)
    )
  )();
};

const e2 = () => {
  pipe(
    sequenceT(TE.taskEither)(TE.left('no bad'), TE.right('tim')),
    TE.map(([answer, name]) =>
      console.log(`Hello ${name}! The answer you're looking for is ${answer}`)
    ),
    TE.mapLeft(console.error)
  )();
};
