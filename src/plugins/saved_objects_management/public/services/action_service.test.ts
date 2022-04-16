/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import {
  CopyToSpaceSavedObjectsManagementAction,
  ShareToSpaceSavedObjectsManagementAction,
} from './actions';
import {
  SavedObjectsManagementActionService,
  SavedObjectsManagementActionServiceSetup,
} from './action_service';
import { SavedObjectsManagementAction } from './types';

class DummyAction extends SavedObjectsManagementAction {
  constructor(public id: string) {
    super();
  }

  public euiAction = {
    name: 'name',
    description: 'description',
    icon: 'icon',
    type: 'type',
  };

  public render = () => '';
}

describe('SavedObjectsManagementActionRegistry', () => {
  let service: SavedObjectsManagementActionService;
  let setup: SavedObjectsManagementActionServiceSetup;

  const createAction = (id: string): SavedObjectsManagementAction => {
    return new DummyAction(id);
  };

  beforeEach(() => {
    service = new SavedObjectsManagementActionService();
    setup = service.setup();
  });

  describe('#register', () => {
    it('allows actions to be registered and retrieved', () => {
      const action = createAction('foo');
      setup.register(action);
      const start = service.start(spacesPluginMock.createStartContract());
      expect(start.getAll()).toEqual([
        action,
        expect.any(ShareToSpaceSavedObjectsManagementAction),
        expect.any(CopyToSpaceSavedObjectsManagementAction),
      ]);
    });

    it('does not allow actions with duplicate ids to be registered', () => {
      const action = createAction('my-action');
      setup.register(action);
      expect(() => setup.register(action)).toThrowErrorMatchingInlineSnapshot(
        `"Saved Objects Management Action with id 'my-action' already exists"`
      );
    });
  });

  describe('#has', () => {
    it('returns true when an action with a matching ID exists', () => {
      const action = createAction('existing-action');
      setup.register(action);
      const start = service.start();
      expect(start.has('existing-action')).toEqual(true);
    });

    it(`returns false when an action doesn't exist`, () => {
      const start = service.start();
      expect(start.has('missing-action')).toEqual(false);
    });
  });
});
