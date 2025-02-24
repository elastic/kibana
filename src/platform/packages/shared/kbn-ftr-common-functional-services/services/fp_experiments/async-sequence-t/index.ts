/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { array } from 'fp-ts/lib/Array';
import { failure } from 'io-ts/lib/PathReporter';
import axios, { AxiosResponse } from 'axios';
import * as t from 'io-ts';
import { sequenceT } from 'fp-ts/lib/Apply';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { flatten, map } from 'fp-ts/lib/Array';
import * as T from 'fp-ts/lib/Task';
import { flow } from 'fp-ts/lib/function';

export const sequenceTExperiment = () => {
  e3_LessUgly();
};

const e2_Ugly = () => {
  // create a schema to load our user data into
  const users = t.type({
    data: t.array(
      t.type({
        first_name: t.string,
      })
    ),
  });

  // schema to hold the deepest of answers
  const answer = t.type({
    ans: t.number,
  });

  // Convert our api call to a TaskEither
  const httpGet = (url: string) =>
    TE.tryCatch<Error, AxiosResponse>(
      () => axios.get(url),
      (reason) => new Error(String(reason))
    );

  /**
   * Make our api call, pull out the data section and decode it
   * We need to massage the Error type, since `decode` returns a list of `ValidationError`s
   * We should probably use `reporter` to make this nicely readable down the line
   */
  const getUser = pipe(
    httpGet('https://reqres.in/api/users?page=1'),
    TE.map((x) => x.data),
    TE.chain((str) =>
      pipe(
        users.decode(str),
        E.mapLeft((err) => new Error(String(err))),
        TE.fromEither
      )
    )
  );

  const getAnswer = pipe(
    TE.right(42),
    TE.chain((ans) =>
      pipe(
        answer.decode({ ans }),
        E.mapLeft((err) => new Error(String(err))),
        TE.fromEither
      )
    )
  );

  /**
   * Make our calls, and iterate over the data we get back
   */
  pipe(
    sequenceT(TE.taskEither)(getAnswer, getUser),
    TE.map(([answer, users]) =>
      array.map(users.data, (user) => {
        console.log(`\nλjs users: \n${JSON.stringify(users, null, 2)}`);
        console.log(`Hello ${user.first_name}! The answer you're looking for is ${answer.ans}`);
      })
    ),
    TE.mapLeft(console.error)
  )();
};

const e3_LessUgly = () => {
  // create a schema to load our user data into
  const users = t.type({
    data: t.array(
      t.type({
        first_name: t.string,
      })
    ),
  });
  type Users = t.TypeOf<typeof users>;

  // schema to hold the deepest of answers
  const answer = t.type({
    ans: t.number,
  });

  // Convert our api call to a TaskEither
  const httpGet = (url: string) =>
    TE.tryCatch<Error, AxiosResponse>(
      () => axios.get(url),
      (reason) => new Error(String(reason))
    );

  // function to decode an unknown into an A
  const decodeWith = <A>(decoder: t.Decoder<unknown, A>) =>
    flow(
      decoder.decode,
      E.mapLeft((errors) => new Error(failure(errors).join('\n'))),
      TE.fromEither
    );

  // takes a url and a decoder and gives you back an Either<Error, A>
  const getFromUrl = <A>(url: string, codec: t.Decoder<unknown, A>) =>
    pipe(
      httpGet(url),
      TE.map((x) => x.data),
      TE.chain(decodeWith(codec))
    );

  const getAnswer = pipe(TE.right({ ans: 42 }), TE.chain(decodeWith(answer)));

  const apiUrl = (page: number) => `https://reqres.in/api/users?page=${page}`;

  const smashUsersTogether = (users1: Users, users2: Users) =>
    pipe(
      flatten([users1.data, users2.data]),
      map((item) => item.first_name)
    );

  const runProgram = pipe(
    sequenceT(TE.taskEither)(getAnswer, getFromUrl(apiUrl(1), users), getFromUrl(apiUrl(2), users)),
    TE.fold(
      (errors) => T.of(errors.message),
      ([ans, users1, users2]) =>
        T.of(
          smashUsersTogether(users1, users2).join(',') +
            `\nThe answer was ${ans.ans} for all of you`
        )
    )
  )();

  runProgram.then(console.log);
};
