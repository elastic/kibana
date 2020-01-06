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
jest.mock('ui/capabilities', () => ({
  capabilities: {
    get: () => ({
      navLinks: {},
      management: {},
      catalogue: {
        item1: true,
        item2: false,
        item3: true,
      },
    }),
  },
}));
import { FeatureCatalogueCategory, FeatureCatalogueRegistryProvider } from './feature_catalogue';

describe('FeatureCatalogueRegistryProvider', () => {
  beforeAll(() => {
    FeatureCatalogueRegistryProvider.register(() => {
      return {
        id: 'item1',
        title: 'foo',
        description: 'this is foo',
        icon: 'savedObjectsApp',
        path: '/app/kibana#/management/kibana/objects',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      };
    });

    FeatureCatalogueRegistryProvider.register(() => {
      return {
        id: 'item2',
        title: 'bar',
        description: 'this is bar',
        icon: 'savedObjectsApp',
        path: '/app/kibana#/management/kibana/objects',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      };
    });

    // intentionally not listed in uiCapabilities.catalogue above
    FeatureCatalogueRegistryProvider.register(() => {
      return {
        id: 'item4',
        title: 'secret',
        description: 'this is a secret',
        icon: 'savedObjectsApp',
        path: '/app/kibana#/management/kibana/objects',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      };
    });
  });

  it('should not return items hidden by uiCapabilities', () => {
    const mockPrivate = entityFn => entityFn();
    const mockInjector = () => null;

    // eslint-disable-next-line new-cap
    const foo = FeatureCatalogueRegistryProvider(mockPrivate, mockInjector).inTitleOrder;
    expect(foo).toEqual([
      {
        id: 'item1',
        title: 'foo',
        description: 'this is foo',
        icon: 'savedObjectsApp',
        path: '/app/kibana#/management/kibana/objects',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      },
      {
        id: 'item4',
        title: 'secret',
        description: 'this is a secret',
        icon: 'savedObjectsApp',
        path: '/app/kibana#/management/kibana/objects',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      },
    ]);
  });
});
