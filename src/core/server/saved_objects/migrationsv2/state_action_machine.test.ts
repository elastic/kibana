/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { stateActionMachine } from './state_action_machine';
import * as E from 'fp-ts/lib/Either';

describe('state action machine', () => {
  const state = { controlState: 'INIT', count: 1 };

  const next = jest.fn((s: typeof state) => {
    if (s.controlState === 'INIT') return () => Promise.resolve(E.right('response'));
    else return null;
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

  test('await the next action and passes the result to the model with the updated state from the previous step', async () => {
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

  test('calls next for each step until next returns null', async () => {
    expect(next).toHaveBeenCalledTimes(4);
    expect(next.mock.results[3]).toMatchObject({
      type: 'return',
      value: null,
    });
  });

  test('returns the final state once all steps are completed', async () => {
    expect(finalStateP).resolves.toMatchInlineSnapshot(`
      Object {
        "controlState": "DONE",
        "count": 3,
      }
    `);
  });

  test("throws if control state doesn't change after 10 steps", async () => {
    expect(
      stateActionMachine(state, next, countUntilModel(11))
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Control state didn't change after 10 steps aborting."`
    );
  });
});
