/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stateActionMachine } from './state_action_machine';
import * as E from 'fp-ts/lib/Either';

describe('state action machine', () => {
  const state = { controlState: 'INIT', count: 1 };

  const next = jest.fn((s: typeof state) => {
    if (s.controlState === 'INIT') return () => Promise.resolve(E.right('response'));
    if (s.controlState === 'DONE') return null;
    else throw new Error('Invalid control state');
  });

  const countUntilModel = (maxCount: number) =>
    jest.fn((s: typeof state, res: E.Either<unknown, string>) => {
      if (s.count === maxCount) {
        return { controlState: 'DONE', count: s.count };
      } else {
        return { controlState: s.controlState, count: s.count + 1 };
      }
    });

  const countUntilThree = countUntilModel(3);
  const finalStateP = stateActionMachine(state, next, countUntilThree);

  test('await the next action and passes the response to the model with the updated state from the previous step', () => {
    expect(countUntilThree.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "controlState": "INIT",
            "count": 1,
          },
          Object {
            "_tag": "Right",
            "right": "response",
          },
        ],
        Array [
          Object {
            "controlState": "INIT",
            "count": 2,
          },
          Object {
            "_tag": "Right",
            "right": "response",
          },
        ],
        Array [
          Object {
            "controlState": "INIT",
            "count": 3,
          },
          Object {
            "_tag": "Right",
            "right": "response",
          },
        ],
      ]
    `);
  });

  test('calls next for each step until next returns null', () => {
    expect(next).toHaveBeenCalledTimes(4);
    expect(next.mock.results[3]).toMatchObject({
      type: 'return',
      value: null,
    });
  });

  test('rejects if an exception is throw from inside an action', async () => {
    await expect(
      stateActionMachine({ ...state, controlState: 'THROW' }, next, countUntilThree)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Invalid control state"`);
  });

  test('resolve with the final state once all steps are completed', async () => {
    await expect(finalStateP).resolves.toMatchInlineSnapshot(`
      Object {
        "controlState": "DONE",
        "count": 3,
      }
    `);
  });
});
