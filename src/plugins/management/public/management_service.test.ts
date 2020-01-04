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

import { ManagementService } from './management_service';
import { coreMock } from '../../../core/public/mocks';

const mockKibanaLegacy = { registerLegacyApp: () => {}, forwardApp: () => {} };

test('Provides default sections', () => {
  const service = new ManagementService().setup(
    mockKibanaLegacy,
    () => {},
    coreMock.createSetup().getStartServices
  );
  expect(service.getAllSections().length).toEqual(3);
  expect(service.getSection('kibana')).not.toBeUndefined();
  expect(service.getSection('logstash')).not.toBeUndefined();
  expect(service.getSection('elasticsearch')).not.toBeUndefined();
});

test('Register section, enable and disable', () => {
  const service = new ManagementService().setup(
    mockKibanaLegacy,
    () => {},
    coreMock.createSetup().getStartServices
  );
  const testSection = service.register({ id: 'test-section', title: 'Test Section' });
  expect(service.getSection('test-section')).not.toBeUndefined();

  const testApp = testSection.registerApp({
    id: 'test-app',
    title: 'Test App',
    mount: () => () => {},
  });
  expect(testSection.getApp('test-app')).not.toBeUndefined();
  expect(service.getSectionsEnabled().length).toEqual(1);
  testApp.disable();
  expect(service.getSectionsEnabled().length).toEqual(0);
});
