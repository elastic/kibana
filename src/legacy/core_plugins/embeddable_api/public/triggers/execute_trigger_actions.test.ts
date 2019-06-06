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

import '../np_core.test.mocks';

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';

const executeFn = jest.fn();

jest.mock('../context_menu_actions/open_context_menu', () => ({
  openContextMenu: (actions: EuiContextMenuPanelDescriptor[]) => jest.fn()(actions),
}));

import { triggerRegistry } from '../triggers';
import { Action, ActionContext, actionRegistry } from '../actions';
import { executeTriggerActions } from './execute_trigger_actions';
import { ContactCardEmbeddable } from '../test_samples';

class TestAction extends Action {
  public readonly type = 'testAction';
  public checkCompatibility: (context: ActionContext) => boolean;

  constructor(id: string, checkCompatibility: (context: ActionContext) => boolean) {
    super(id);
    this.checkCompatibility = checkCompatibility;
  }

  public getDisplayName() {
    return 'test';
  }

  async isCompatible(context: ActionContext) {
    return this.checkCompatibility(context);
  }

  execute(context: ActionContext) {
    executeFn(context);
  }
}

beforeEach(() => {
  triggerRegistry.reset();
  actionRegistry.reset();
  executeFn.mockReset();
});

afterAll(() => {
  triggerRegistry.reset();
});

test('executeTriggerActions executes a single action mapped to a trigger', async () => {
  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: ['test1'],
  };
  triggerRegistry.set(testTrigger.id, testTrigger);

  actionRegistry.set('test1', new TestAction('test1', () => true));

  const context = {
    embeddable: new ContactCardEmbeddable({ id: '123', firstName: 'Stacey', lastName: 'G' }),
    triggerContext: {},
  };

  await executeTriggerActions('MYTRIGGER', context);

  expect(executeFn).toBeCalledTimes(1);
  expect(executeFn).toBeCalledWith(context);
});

test('executeTriggerActions throws an error if the action id does not exist', async () => {
  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: ['testaction'],
  };
  triggerRegistry.set(testTrigger.id, testTrigger);

  const context = {
    embeddable: new ContactCardEmbeddable({ id: '123', firstName: 'Stacey', lastName: 'G' }),
    triggerContext: {},
  };
  await expect(executeTriggerActions('MYTRIGGER', context)).rejects.toThrowError();
});

test('executeTriggerActions does not execute an incompatible action', async () => {
  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: ['test1'],
  };
  triggerRegistry.set(testTrigger.id, testTrigger);

  actionRegistry.set(
    'test1',
    new TestAction('test1', ({ embeddable }) => embeddable.id === 'executeme')
  );

  const context = {
    embeddable: new ContactCardEmbeddable({ id: 'executeme', firstName: 'Stacey', lastName: 'G' }),
    triggerContext: {},
  };

  await executeTriggerActions('MYTRIGGER', context);
  expect(executeFn).toBeCalledTimes(1);
});

test('executeTriggerActions shows a context menu when more than one action is mapped to a trigger', async () => {
  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: ['test1', 'test2'],
  };
  triggerRegistry.set(testTrigger.id, testTrigger);

  actionRegistry.set('test1', new TestAction('test1', () => true));
  actionRegistry.set('test2', new TestAction('test2', () => true));

  const context = {
    embeddable: new ContactCardEmbeddable({ id: 'executeme', firstName: 'Stacey', lastName: 'G' }),
    triggerContext: {},
  };

  await executeTriggerActions('MYTRIGGER', context);
  expect(executeFn).toBeCalledTimes(0);
});
