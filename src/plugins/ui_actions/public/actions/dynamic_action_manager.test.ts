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

import { DynamicActionManager, DynamicActionManagerParams } from './dynamic_action_manager';

const setup = () => {
  const isCompatible = async () => true;
  const storage: DynamicActionManagerParams['storage'] = {
    count: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
    read: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };
  const uiActions: DynamicActionManagerParams['uiActions'] = {
    addTriggerAction: jest.fn(),
    getActionFactory: jest.fn(),
    removeTriggerAction: jest.fn(),
  };
  const manager = new DynamicActionManager({
    isCompatible,
    storage,
    uiActions,
  });

  return {
    isCompatible,
    storage,
    uiActions,
    manager,
  };
};

describe('DynamicActionManager', () => {
  test('can instantiate', () => {
    const { manager } = setup();
    expect(manager).toBeInstanceOf(DynamicActionManager);
  });

  describe('.start()', () => {
    test.todo('instantiates stored events');
    test.todo('does nothing when no events stored');
  });

  describe('.stop()', () => {
    test.todo('removes events from UI actions registry');
    test.todo('does nothing when no events stored');
  });

  describe('.createEvent()', () => {
    test.todo('stores new event in storage');
    test.todo('instantiates event in actions service');
  });

  describe('.updateEvent()', () => {
    test.todo('removes old event from ui actions service');
    test.todo('updates event in storage');
    test.todo('adds new event to ui actions service');
  });

  describe('.deleteEvents()', () => {
    test.todo('removes all actions from ui actions service');
    test.todo('removes all events from storage');
    describe('when event is removed from storage its action is also killed', () => {
      test.todo('when subsequent event fails to be removed from storage');
    });
  });

  describe('.list()', () => {
    test.todo('returns stored events');
  });

  describe('.count()', () => {
    test.todo('returns number of stored events');
  });
});
