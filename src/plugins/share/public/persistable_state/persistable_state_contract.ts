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

import { identity, noop } from 'lodash';
import { i18n } from '@kbn/i18n';
import { PersistableStateContract, PersistableStateDefinition } from './types';

export function createPersistableStateContract<Definition extends PersistableStateDefinition>(
  definition: Definition
): PersistableStateContract<Definition['id']> {
  const { id, isDeprecated, extractReferences, injectReferences, migrate } = definition;

  if (isDeprecated && !migrate) {
    throw new Error(
      i18n.translate('share.persistableState.error.noMigrationFnProvided', {
        defaultMessage:
          'If the persistable state is marked as deprecated, you must provide a migration function.',
      })
    );
  }

  if (!isDeprecated && migrate) {
    throw new Error(
      i18n.translate('share.persistableState.error.migrationFnGivenNotDeprecated', {
        defaultMessage:
          'If you provide a migration function, you must mark this persistable state as deprecated.',
      })
    );
  }

  return {
    id,
    isDeprecated: !!isDeprecated,
    extractReferences: extractReferences || identity,
    injectReferences: injectReferences || noop,
    migrate,
  };
}
