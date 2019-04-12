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
import { EuiContextMenuPanelDescriptor } from '@elastic/eui';

const executeFn = jest.fn();

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

jest.mock('../context_menu_actions/open_context_menu', () => ({
  openContextMenu: (actions: EuiContextMenuPanelDescriptor[]) => jest.fn()(actions),
}));

import { triggerRegistry } from '../triggers';
import { Action, ExecuteActionContext, actionRegistry } from '../actions';
import { executeTriggerActions } from './execute_trigger_actions';
import { HelloWorldEmbeddable } from '../__test__';

class TestAction extends Action {
  public checkCompatibility: (context: ExecuteActionContext) => boolean;

  constructor(id: string, checkCompatibility: (context: ExecuteActionContext) => boolean) {
    super(id);
    this.checkCompatibility = checkCompatibility;
  }

  public getTitle() {
    return 'test';
  }

  isCompatible(context: ExecuteActionContext) {
    return Promise.resolve(this.checkCompatibility(context));
  }

  execute(context: ExecuteActionContext) {
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
  triggerRegistry.registerTrigger(testTrigger);

  actionRegistry.addAction(new TestAction('test1', () => true));

  const context = {
    embeddable: new HelloWorldEmbeddable({ id: '123', firstName: 'Stacey' }),
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
  triggerRegistry.registerTrigger(testTrigger);

  const context = {
    embeddable: new HelloWorldEmbeddable({ id: '123', firstName: 'Stacey' }),
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
  triggerRegistry.registerTrigger(testTrigger);

  actionRegistry.addAction(
    new TestAction('test1', ({ embeddable }) => embeddable.id === 'executeme')
  );

  const context = {
    embeddable: new HelloWorldEmbeddable({ id: 'executeme', firstName: 'Stacey' }),
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
  triggerRegistry.registerTrigger(testTrigger);

  actionRegistry.addAction(new TestAction('test1', () => true));
  actionRegistry.addAction(new TestAction('test2', () => true));

  const context = {
    embeddable: new HelloWorldEmbeddable({ id: 'executeme', firstName: 'Stacey' }),
    triggerContext: {},
  };

  await executeTriggerActions('MYTRIGGER', context);
  expect(executeFn).toBeCalledTimes(0);
});
