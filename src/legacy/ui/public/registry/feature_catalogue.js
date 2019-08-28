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

import { uiRegistry } from './_registry';
import { capabilities } from '../capabilities';

export const FeatureCatalogueRegistryProvider = uiRegistry({
  name: 'featureCatalogue',
  index: ['id'],
  group: ['category'],
  order: ['title'],
  filter: featureCatalogItem => {
    const isDisabledViaCapabilities = capabilities.get().catalogue[featureCatalogItem.id] === false;
    return !isDisabledViaCapabilities && Object.keys(featureCatalogItem).length > 0;
  }
});

export const FeatureCatalogueCategory = {
  ADMIN: 'admin',
  DATA: 'data',
  OTHER: 'other'
};
