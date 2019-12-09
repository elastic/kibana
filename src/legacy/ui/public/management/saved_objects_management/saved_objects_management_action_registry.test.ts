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

import { SavedObjectsManagementActionRegistry } from './saved_objects_management_action_registry';
import { SavedObjectsManagementAction } from './saved_objects_management_action';

describe('SavedObjectsManagementActionRegistry', () => {
  it('allows actions to be registered and retrieved', () => {
    const action = { id: 'foo' } as SavedObjectsManagementAction;
    SavedObjectsManagementActionRegistry.register(action);
    expect(SavedObjectsManagementActionRegistry.get()).toContain(action);
  });

  it('requires an "id" property', () => {
    expect(() =>
      SavedObjectsManagementActionRegistry.register({} as SavedObjectsManagementAction)
    ).toThrowErrorMatchingInlineSnapshot(`"Saved Objects Management Actions must have an id"`);
  });

  it('does not allow actions with duplicate ids to be registered', () => {
    const action = { id: 'my-action' } as SavedObjectsManagementAction;
    SavedObjectsManagementActionRegistry.register(action);
    expect(() =>
      SavedObjectsManagementActionRegistry.register(action)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Saved Objects Management Action with id 'my-action' already exists"`
    );
  });

  it('#has returns true when an action with a matching ID exists', () => {
    const action = { id: 'existing-action' } as SavedObjectsManagementAction;
    SavedObjectsManagementActionRegistry.register(action);
    expect(SavedObjectsManagementActionRegistry.has('existing-action')).toEqual(true);
  });

  it(`#has returns false when an action with doesn't exist`, () => {
    expect(SavedObjectsManagementActionRegistry.has('missing-action')).toEqual(false);
  });
});
