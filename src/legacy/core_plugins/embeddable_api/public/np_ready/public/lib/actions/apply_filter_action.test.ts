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

import { Action } from './action';
import { ApplyFilterAction } from './apply_filter_action';
import { expectError } from '../../tests/helpers';

test('is instance of Action', () => {
  const action = new ApplyFilterAction();
  expect(action).toBeInstanceOf(Action);
});

test('has APPLY_FILTER_ACTION type and id', () => {
  const action = new ApplyFilterAction();
  expect(action.id).toBe('APPLY_FILTER_ACTION');
  expect(action.type).toBe('APPLY_FILTER_ACTION');
});

test('has expected display name', () => {
  const action = new ApplyFilterAction();
  expect(action.getDisplayName()).toMatchInlineSnapshot(`"Apply filter to current view"`);
});

describe('isCompatible()', () => {
  test('when embeddable filters and triggerContext filters exist, returns true', async () => {
    const action = new ApplyFilterAction();
    const result = await action.isCompatible({
      embeddable: {
        getRoot: () => ({
          getInput: () => ({
            filters: [],
          }),
        }),
      } as any,
      filters: [],
    });
    expect(result).toBe(true);
  });

  test('when embeddable filters not set, returns false', async () => {
    const action = new ApplyFilterAction();
    const result = await action.isCompatible({
      embeddable: {
        getRoot: () => ({
          getInput: () => ({
            // filters: [],
          }),
        }),
      } as any,
      filters: [],
    });
    expect(result).toBe(false);
  });

  test('when triggerContext or triggerContext filters are not set, returns false', async () => {
    const action = new ApplyFilterAction();

    const result1 = await action.isCompatible({
      embeddable: {
        getRoot: () => ({
          getInput: () => ({
            filters: [],
          }),
        }),
      } as any,
    } as any);
    expect(result1).toBe(false);
  });
});

const getEmbeddable = () => {
  const root = {
    getInput: jest.fn(() => ({
      filters: [],
    })),
    updateInput: jest.fn(),
  };
  const embeddable = {
    getRoot: () => root,
  } as any;
  return [embeddable, root];
};

describe('execute()', () => {
  describe('when triggerContext not set', () => {
    test('throws an error', async () => {
      const action = new ApplyFilterAction();
      const error = expectError(() =>
        action.execute({
          embeddable: getEmbeddable(),
        } as any)
      );
      expect(error).toBeInstanceOf(Error);
    });

    test('updates filter input on success', async done => {
      const action = new ApplyFilterAction();
      const [embeddable, root] = getEmbeddable();

      await action.execute({
        embeddable,
        filters: ['FILTER' as any],
      });

      expect(root.updateInput).toHaveBeenCalledTimes(1);
      expect(root.updateInput.mock.calls[0][0]).toMatchObject({
        filters: ['FILTER'],
      });

      done();
    });

    test('checks if action isCompatible', async done => {
      const action = new ApplyFilterAction();
      const spy = jest.spyOn(action, 'isCompatible');
      const [embeddable] = getEmbeddable();

      await action.execute({
        embeddable,
        filters: ['FILTER' as any],
      });

      expect(spy).toHaveBeenCalledTimes(1);

      done();
    });
  });
});
