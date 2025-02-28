/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Effect, Context } from 'effect';
import { TimeoutException } from 'effect/Cause';

export const helloAgain = () => {
  interface ISendGreetings {
    sendGreetings(name: string): Effect.Effect<void>;
  }

  class SendGreetings extends Context.Tag('SendGreetings')<SendGreetings, ISendGreetings>() {}

  interface ITranslateGreeting {
    translate(greeting: string): Effect.Effect<string>;
  }

  class TranslateGreeting extends Context.Tag('TranslateGreeting')<
    TranslateGreeting,
    ITranslateGreeting
  >() {}

  console.log('get to effecting!');

  const hello = (name?: string): Effect.Effect<string> =>
    Effect.gen(function* () {
      return `Hello, ${name || 'world'}!`;
    });

  const sayHello: Effect.Effect<void, never, SendGreetings | TranslateGreeting> = Effect.gen(
    function* () {
      const sender = yield* SendGreetings;
      const translator = yield* TranslateGreeting;
      const greeting = yield* hello('world');
      const translated = yield* translator.translate(greeting);
      yield* sender.sendGreetings(translated);
    }
  );

  const camelot: Effect.Effect<void, TimeoutException, SendGreetings> = Effect.gen(function* () {
    yield* sayHello.pipe(Effect.repeatN(2), Effect.timeout('10 seconds'));
  });

  type SendGreetingsShape = Context.Tag.Service<SendGreetings>;

  const program = camelot.pipe(
    Effect.provideService(SendGreetings, {
      sendGreetings: (x) => Effect.sync(() => console.log(`Sent x: ${x}`)),
    }),
    Effect.provideService(TranslateGreeting, {
      translate: (x) => Effect.sync(() => `translated to ${x}`),
    })
  );

  Effect.runSync(program);
};
