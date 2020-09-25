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

import { ControlState, model, next, State } from '.';
import { ElasticsearchClient } from '../../elasticsearch';

const initState: State = {
  controlState: 'INIT',
  kibanaVersion: '7.11.0',
  aliases: {},
  source: '',
  target: '',
  error: undefined,
  log: [],
  retryCount: 0,
  retryDelay: 0,
};

describe('migrations state machine', () => {
  test.todo("throws if control state doesn't change after 10 steps");

  test.todo('cycles through all steps until next returns null');

  test.todo('returns the final state once all steps are completed');

  describe('model transitions from', () => {
    describe('INIT', () => {
      test('-> DONE if .kibana_current is already pointing to the target index', () => {
        const newState = model(initState, {
          fetchAliases: {
            '.kibana_current': '.kibana_7.11.0_001',
            '.kibana_7.11.0': '.kibana_7.11.0_001',
          },
        });

        expect(newState.controlState).toEqual('DONE');
      });
      test("-> FATAL when .kibana_current points to newer version's index", () => {
        const newState = model(initState, {
          fetchAliases: {
            '.kibana_current': '.kibana_7.12.0_001',
            '.kibana_7.11.0': '.kibana_7.11.0_001',
            '.kibana_7.12.0': '.kibana_7.12.0_001',
          },
        });

        expect(newState.controlState).toEqual('FATAL');
        expect(newState.error?.message).toMatchInlineSnapshot(
          `"The .kibana_current alias is pointing to a newer version of Kibana: v7.12.0"`
        );
      });
      test('-> SET_SOURCE_WRITE_BLOCK when migrating from >= 7.11.0', () => {
        const newState = model(
          { ...initState, ...{ kibanaVersion: '7.12.0' } },
          {
            fetchAliases: {
              '.kibana_current': '.kibana_7.11.0_001',
              '.kibana': '.kibana_3',
            },
          }
        );

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: '.kibana_7.11.0_001',
          target: '.kibana_7.12.0_001',
        });
      });
      test('-> SET_SOURCE_WRITE_BLOCK when migrating from >= 7.0.0 < 7.11.0', () => {
        const newState = model(initState, {
          fetchAliases: {
            '.kibana': '.kibana_3',
          },
        });

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: '.kibana_3',
          target: '.kibana_7.11.0_001',
        });
      });
      test.todo(
        '-> SET_SOURCE_WRITE_BLOCK when migrating from >= 6.0.0 < 7.0.0'
      ); /* , () => {
        const newState = model(state, {
          fetchAliases: {
          },
        });

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          source: '.kibana',
          target: '.kibana_7.11.0_001',
        });
      });*/
      test('-> INIT_NEW_INDICES when no indices/aliases exist', () => {
        const newState = model(initState, {
          fetchAliases: {},
        });

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
      const state = { ...initState, ...{ controlState: 'FATAL' as ControlState } };
      const action = next({} as ElasticsearchClient, state);
      expect(action).toEqual(null);
    });
    it('FATAL returns null', () => {
      const state = { ...initState, ...{ controlState: 'FATAL' as ControlState } };
      const action = next({} as ElasticsearchClient, state);
      expect(action).toEqual(null);
    });
  });
});
