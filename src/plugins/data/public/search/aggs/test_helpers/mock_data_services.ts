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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { dataPluginMock } from '../../../../public/mocks';
import {
  setFieldFormats,
  setIndexPatterns,
  setInjectedMetadata,
  setNotifications,
  setOverlays,
  setQueryService,
  setSearchService,
  setUiSettings,
} from '../../../../public/services';

/**
 * Testing helper which calls all of the service setters used in the
 * data plugin. Services are added using their provided mocks.
 *
 * @internal
 */
export function mockDataServices() {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();

  setFieldFormats(data.fieldFormats);
  setIndexPatterns(data.indexPatterns);
  setInjectedMetadata(core.injectedMetadata);
  setNotifications(core.notifications);
  setOverlays(core.overlays);
  setQueryService(data.query);
  setSearchService(data.search);
  setUiSettings(core.uiSettings);
}
