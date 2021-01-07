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
