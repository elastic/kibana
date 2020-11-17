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

import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { FatalState, model, next, State, ResponseType } from '.';
import { ElasticsearchClient } from '../../elasticsearch';

const initState: State = {
  controlState: 'INIT',
  kibanaVersion: '7.11.0',
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
        state = model(state, Either.left(new Error()));

        expect(state.retryCount).toEqual(1);
        expect(state.retryDelay).toEqual(2000);

        state = model(state, Either.left(new Error()));

        expect(state.retryCount).toEqual(2);
        expect(state.retryDelay).toEqual(4000);

        state = model(state, Either.left(new Error()));

        expect(state.retryCount).toEqual(3);
        expect(state.retryDelay).toEqual(8000);

        state = model(state, Either.left(new Error()));

        expect(state.retryCount).toEqual(4);
        expect(state.retryDelay).toEqual(16000);

        state = model(state, Either.left(new Error()));

        expect(state.retryCount).toEqual(5);
        expect(state.retryDelay).toEqual(32000);

        state = model(state, Either.left(new Error()));
      });

      test('resets retryCount, retryDelay when an action succeeds', () => {
        const res: ResponseType<'INIT'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.11.0': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model({ ...initState, ...{ retryCount: 5, retryDelay: 32000 } }, res);

        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      test('terminates to FATAL after 5 retries', () => {
        const newState = model(
          { ...initState, ...{ retryCount: 5, retryDelay: 32000 } },
          Either.left(new Error())
        );

        expect(newState.controlState).toEqual('FATAL');
      });
    });

    describe('transitions from', () => {
      test('INIT -> UPDATE_TARGET_MAPPINGS if .kibana is already pointing to the target index', () => {
        const res: ResponseType<'INIT'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.11.0': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(initState, res);

        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS');
      });
      test("INIT -> FATAL when .kibana points to newer version's index", () => {
        const res: ResponseType<'INIT'> = Either.right({
          '.kibana_7.12.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.12.0': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
          '.kibana_7.11.0_001': {
            aliases: { '.kibana_7.11.0': {} },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(initState, res) as FatalState;

        expect(newState.controlState).toEqual('FATAL');
        expect(newState.error?.message).toMatchInlineSnapshot(
          `"The .kibana alias is pointing to a newer version of Kibana: v7.12.0"`
        );
      });
      test('INIT -> SET_SOURCE_WRITE_BLOCK when migrating from >= 7.11.0', () => {
        const res: ResponseType<'INIT'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
          '.kibana_3': {
            aliases: {},
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model({ ...initState, ...{ kibanaVersion: '7.12.0' } }, res);

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: Option.some('.kibana_7.11.0_001'),
          target: '.kibana_7.12.0_001',
        });
      });
      test('INIT -> SET_SOURCE_WRITE_BLOCK when migrating from >= 7.0.0 < 7.11.0', () => {
        const res: ResponseType<'INIT'> = Either.right({
          '.kibana_3': {
            aliases: {
              '.kibana': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(initState, res);

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: Option.some('.kibana_3'),
          target: '.kibana_7.11.0_001',
        });
      });
      test('INIT -> SET_LEGACY_WRITE_BLOCK when migrating from >= 6.0.0 < 7.0.0', () => {
        const res: ResponseType<'INIT'> = Either.right({
          '.kibana': {
            aliases: {},
            mappings: { properties: {}, _meta: {} },
            settings: {},
          },
        });
        const newState = model(initState, res);

        expect(newState).toMatchObject({
          controlState: 'SET_LEGACY_WRITE_BLOCK',
          source: Option.some('.kibana_pre6.5.0_001'),
          target: '.kibana_7.11.0_001',
        });
      });
      test('INIT -> CREATE_NEW_TARGET when no indices/aliases exist', () => {
        const res: ResponseType<'INIT'> = Either.right({});
        const newState = model(initState, res);

        expect(newState).toMatchObject({
          controlState: 'CREATE_NEW_TARGET',
          source: Option.none,
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
