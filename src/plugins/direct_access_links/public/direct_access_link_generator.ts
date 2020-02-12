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

import { i18n } from '@kbn/i18n';

export type GeneratorId = string;

export interface GeneratorStateMapping {
  [key: string]: {
    State: {};
    MigratedId?: string;
    MigratedState?: {};
  };
}

export interface AccessLinkGenerator<Id extends GeneratorId> {
  id: Id;
  createUrl(state: GeneratorStateMapping[Id]['State']): Promise<string>;
  isDeprecated: boolean;
  migrate(
    state: GeneratorStateMapping[Id]['State']
  ): {
    state: GeneratorStateMapping[Id]['MigratedState'];
    id: GeneratorStateMapping[Id]['MigratedId'];
  };
}

interface DirectAccessLinkOptions<Id extends GeneratorId> {
  id: Id;
  createUrl: (state: GeneratorStateMapping[Id]['State']) => Promise<string>;
  isDeprecated?: boolean;
  migrate?: (
    state: GeneratorStateMapping[Id]['State']
  ) => {
    state: GeneratorStateMapping[Id]['MigratedState'];
    id: GeneratorStateMapping[Id]['MigratedId'];
  };
}

export const createDirectAccessLinkGenerator = <Id extends GeneratorId>(
  options: DirectAccessLinkOptions<Id>
): AccessLinkGenerator<Id> => {
  if (options.isDeprecated && !options.migrate) {
    throw new Error(
      i18n.translate('directAccessLinks.error.noMigrationFnProvided', {
        defaultMessage:
          'If the access link generator is marked as deprecated, you must provide a migration function.',
      })
    );
  }

  if (!options.isDeprecated && options.migrate) {
    throw new Error(
      i18n.translate('directAccessLinks.error.migrationFnGivenNotDeprecated', {
        defaultMessage:
          'If you provide a migration function, you must mark this generator as deprecated',
      })
    );
  }

  return {
    id: options.id,
    createUrl: options.createUrl,
    isDeprecated: !!options.isDeprecated,
    migrate: (state: GeneratorStateMapping[Id]['State']) => {
      if (!options.isDeprecated) {
        throw new Error(
          i18n.translate('directAccessLinks.error.migrateCalledNotDeprecated', {
            defaultMessage: 'You cannot call migrate on a non-deprecated generator.',
          })
        );
      }

      if (!options.migrate) {
        throw new Error(
          i18n.translate('directAccessLinks.error.noMigrationFnProvided', {
            defaultMessage: 'Migration function missing.',
          })
        );
      }

      return options.migrate(state);
    },
  };
};
