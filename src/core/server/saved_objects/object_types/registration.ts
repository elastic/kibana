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

import { LEGACY_URL_ALIAS_TYPE } from './constants';
import { ISavedObjectTypeRegistry, SavedObjectTypeRegistry } from '..';

const legacyUrlAliasMappings = {
  properties: {
    targetNamespace: { type: 'keyword' },
    targetType: { type: 'keyword' },
    targetId: { type: 'keyword' },
    lastResolved: { type: 'date' },
    resolveCounter: { type: 'integer' },
    disabled: { type: 'boolean' },
  },
};

/**
 * @internal
 */
export function registerCoreObjectTypes(
  typeRegistry: ISavedObjectTypeRegistry & Pick<SavedObjectTypeRegistry, 'registerType'>
) {
  typeRegistry.registerType({
    name: LEGACY_URL_ALIAS_TYPE,
    namespaceType: 'agnostic',
    mappings: legacyUrlAliasMappings,
    hidden: true,
  });
}
