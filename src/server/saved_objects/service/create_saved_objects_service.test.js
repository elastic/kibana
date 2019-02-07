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

import { createSavedObjectsService } from './create_saved_objects_service';
import sinon from 'sinon';

describe('saved object service creation', () => {
  it('it creates a client', () => {
    const server = {
      config: () => { return { get: sinon.stub() }; },
      getKibanaIndexMappingsDsl: () => {
        return {
          properties: {
            allowedType1: { properties: {} },
            allowedType2: { properties: {} },
            hiddenType: { properties: {} },
          },
        };
      },
    };
    server.config().get.returns('index-name', 'index-name');
    const schema = { isHiddenType: sinon.stub() };
    schema.isHiddenType.returns(false, false, true);
    const serializer = sinon.spy;
    const migrator = sinon.spy;
    const extraTypes = ['hiddenType', 'hiddenType', 'hiddenType'];
    const service = createSavedObjectsService(server, schema, serializer, migrator, extraTypes);
    expect(service).toBeDefined();
    expect(service.types.sort()).toEqual(['allowedType1', 'allowedType2', 'hiddenType'].sort());
  });
});
