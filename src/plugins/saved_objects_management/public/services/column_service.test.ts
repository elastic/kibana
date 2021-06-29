/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsManagementColumnService,
  SavedObjectsManagementColumnServiceSetup,
} from './column_service';
import { SavedObjectsManagementColumn } from './types';

class DummyColumn implements SavedObjectsManagementColumn<unknown> {
  constructor(public id: string) {}

  public euiColumn = {
    field: 'id',
    name: 'name',
  };

  public loadData = async () => {};
}

describe('SavedObjectsManagementColumnRegistry', () => {
  let service: SavedObjectsManagementColumnService;
  let setup: SavedObjectsManagementColumnServiceSetup;

  const createColumn = (id: string): SavedObjectsManagementColumn<unknown> => {
    return new DummyColumn(id);
  };

  beforeEach(() => {
    service = new SavedObjectsManagementColumnService();
    setup = service.setup();
  });

  describe('#register', () => {
    it('allows columns to be registered and retrieved', () => {
      const column = createColumn('foo');
      setup.register(column);
      const start = service.start();
      expect(start.getAll()).toContain(column);
    });

    it('does not allow columns with duplicate ids to be registered', () => {
      const column = createColumn('my-column');
      setup.register(column);
      expect(() => setup.register(column)).toThrowErrorMatchingInlineSnapshot(
        `"Saved Objects Management Column with id 'my-column' already exists"`
      );
    });
  });
});
