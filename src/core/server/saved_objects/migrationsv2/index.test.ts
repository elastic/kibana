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

import { left, right } from 'fp-ts/lib/Either';

import { FatalState, model, next, State } from '.';
import { ElasticsearchClient } from '../../elasticsearch';

const initState: State = {
  controlState: 'INIT',
  kibanaVersion: '7.11.0',
  aliases: {},
  source: '',
  target: '',
  log: [],
  retryCount: 0,
  retryDelay: 0,
  indexPrefix: '.kibana',
  migrationVersionPerType: {},
  targetMappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
};

describe('migrations state machine', () => {
  test.todo("throws if control state doesn't change after 10 steps");

  test.todo('cycles through all steps until next returns null');

  test.todo('returns the final state once all steps are completed');

  describe('model', () => {
    describe('exponential retry delay', () => {
      test('sets retryCount, exponential retryDelay when an action fails', () => {
        let state: State = initState;
        state = model(state, left(new Error()));

        expect(state.retryCount).toEqual(1);
        expect(state.retryDelay).toEqual(2000);

        state = model(state, left(new Error()));

        expect(state.retryCount).toEqual(2);
        expect(state.retryDelay).toEqual(4000);

        state = model(state, left(new Error()));

        expect(state.retryCount).toEqual(3);
        expect(state.retryDelay).toEqual(8000);

        state = model(state, left(new Error()));

        expect(state.retryCount).toEqual(4);
        expect(state.retryDelay).toEqual(16000);

        state = model(state, left(new Error()));

        expect(state.retryCount).toEqual(5);
        expect(state.retryDelay).toEqual(32000);

        state = model(state, left(new Error()));
      });

      test('resets retryCount, retryDelay when an action succeeds', () => {
        const newState = model(
          { ...initState, ...{ retryCount: 5, retryDelay: 32000 } },
          right({
            '.kibana_current': '.kibana_7.11.0_001',
            '.kibana_7.11.0': '.kibana_7.11.0_001',
          })
        );

        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      test('terminates to FATAL after 5 retries', () => {
        const newState = model(
          { ...initState, ...{ retryCount: 5, retryDelay: 32000 } },
          left(new Error())
        );

        expect(newState.controlState).toEqual('FATAL');
      });
    });

    describe('transitions from', () => {
      test('INIT -> UPDATE_TARGET_MAPPINGS if .kibana_current is already pointing to the target index', () => {
        const newState = model(
          initState,
          right({
            '.kibana_7.11.0_001': {
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              aliases: {
                '.kibana_current': {},
                '.kibana_7.11.0': {},
              },
            },
          })
        );

        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS');
      });
      test("INIT -> FATAL when .kibana_current points to newer version's index", () => {
        const newState = model(
          initState,
          right({
            '.kibana_7.12.0_001': {
              aliases: {
                '.kibana_current': {},
                '.kibana_7.12.0': {},
              },
            },
            '.kibana_7.11.0_001': {
              aliases: { '.kibana_7.11.0': {} },
            },
          })
        ) as FatalState;

        expect(newState.controlState).toEqual('FATAL');
        expect(newState.error?.message).toMatchInlineSnapshot(
          `"The .kibana_current alias is pointing to a newer version of Kibana: v7.12.0"`
        );
      });
      test('INIT -> SET_SOURCE_WRITE_BLOCK when migrating from >= 7.11.0', () => {
        const newState = model(
          { ...initState, ...{ kibanaVersion: '7.12.0' } },
          right({
            '.kibana_7.11.0_001': {
              aliases: { '.kibana_current': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            },
            '.kibana_3': { aliases: { '.kibana': {} } },
          })
        );

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: '.kibana_7.11.0_001',
          target: '.kibana_7.12.0_001',
        });
      });
      test('INIT -> SET_SOURCE_WRITE_BLOCK when migrating from >= 7.0.0 < 7.11.0', () => {
        const newState = model(
          initState,
          right({
            '.kibana_3': {
              aliases: {
                '.kibana': {},
              },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            },
          })
        );

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: '.kibana_3',
          target: '.kibana_7.11.0_001',
        });
      });
      test.todo(
        'INIT -> SET_SOURCE_WRITE_BLOCK when migrating from >= 6.0.0 < 7.0.0'
      ); /* , () => {
        const newState = model(state, right({
          fetchAliases: {
          },
        }));

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: '.kibana',
          target: '.kibana_7.11.0_001',
        });
      });*/
      test('INIT -> INIT_NEW_INDICES when no indices/aliases exist', () => {
        const newState = model(initState, right({}));

        expect(newState).toMatchObject({
          controlState: 'INIT_NEW_INDICES',
          source: '',
          target: '.kibana_7.11.0_001',
        });
      });
    });
  });

  describe('next', () => {
    it.todo('when state.retryDelay > 0 delays execution of the next action');
    it.todo('INIT returns fetchAliases thunk');
    it.todo('SET_SOURCE_WRITE_BLOCK returns setIndexWriteBlock thunk');
    it.todo('CLONE_SOURCE returns cloneIndex thunk');
    it('DONE returns null', () => {
      const state: State = { ...initState, ...{ controlState: 'DONE' } };
      const action = next({} as ElasticsearchClient, (() => {}) as any, state);
      expect(action).toEqual(null);
    });
    it('FATAL returns null', () => {
      const state: State = { ...initState, ...{ controlState: 'FATAL' } };
      const action = next({} as ElasticsearchClient, (() => {}) as any, state);
      expect(action).toEqual(null);
    });
  });
});
