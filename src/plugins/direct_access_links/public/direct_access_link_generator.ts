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
import { DirectAccessLinksStart } from './plugin';

export type GeneratorId = string;

export interface GeneratorState<
  S extends {},
  I extends string | undefined = undefined,
  MS extends {} | undefined = undefined
> {
  State: S;
  MigratedId?: I;
  MigratedState?: MS;
}

export interface GeneratorStateMapping {
  // The `any` here is quite unfortunate.  Using `object` actually gives no type errors in my IDE
  // but running `node scripts/type_check` will cause an error:
  // examples/access_links_examples/public/direct_access_link_generator.ts:77:66 -
  // error TS2339: Property 'name' does not exist on type 'object'.  However it's correctly
  // typed when I edit that file.
  [key: string]: GeneratorState<any, string | undefined, object | undefined>;
}

export interface AccessLinkGenerator<Id extends GeneratorId> {
  id: Id;
  createUrl(state: GeneratorStateMapping[Id]['State']): Promise<string>;
  isDeprecated: boolean;
  migrate(
    state: GeneratorStateMapping[Id]['State']
  ): Promise<{
    state: GeneratorStateMapping[Id]['MigratedState'];
    id: GeneratorStateMapping[Id]['MigratedId'];
  }>;
}

const noMigrationFnProvidedWarningText = i18n.translate(
  'directAccessLinks.error.noMigrationFnProvided',
  {
    defaultMessage:
      'If the access link generator is marked as deprecated, you must provide a migration function.',
  }
);

export interface DirectAccessLinkOptions<Id extends GeneratorId> {
  id: Id;
  createUrl?: (state: GeneratorStateMapping[Id]['State']) => Promise<string>;
  isDeprecated?: boolean;
  migrate?: (
    state: GeneratorStateMapping[Id]['State']
  ) => Promise<{
    state: GeneratorStateMapping[Id]['MigratedState'];
    id: GeneratorStateMapping[Id]['MigratedId'];
  }>;
}

export const createDirectAccessLinkGenerator = <Id extends GeneratorId>(
  options: DirectAccessLinkOptions<Id>,
  getGenerator: DirectAccessLinksStart['getAccessLinkGenerator']
): AccessLinkGenerator<Id> => {
  if (options.isDeprecated && !options.migrate) {
    throw new Error(noMigrationFnProvidedWarningText);
  }

  if (!options.isDeprecated && options.migrate) {
    throw new Error(
      i18n.translate('directAccessLinks.error.migrationFnGivenNotDeprecated', {
        defaultMessage:
          'If you provide a migration function, you must mark this generator as deprecated',
      })
    );
  }

  if (!options.createUrl && !options.isDeprecated) {
    throw new Error(
      i18n.translate('directAccessLinks.error.noCreateUrlFnProvided', {
        defaultMessage:
          'This generator is not marked as deprecated. Please provide a createUrl fn.',
      })
    );
  }

  if (options.createUrl && options.isDeprecated) {
    throw new Error(
      i18n.translate('directAccessLinks.error.createUrlFnProvided', {
        defaultMessage: 'This generator is marked as deprecated. Do not supply a createUrl fn.',
      })
    );
  }

  return {
    id: options.id,
    createUrl: async (state: GeneratorStateMapping[Id]['State']) => {
      if (options.createUrl && options.isDeprecated) {
        throw new Error(
          i18n.translate('directAccessLinks.error.createUrlFnProvided', {
            defaultMessage: 'This generator is marked as deprecated. Do not supply a createUrl fn.',
          })
        );
      }

      if (!options.createUrl && !options.isDeprecated) {
        throw new Error(
          i18n.translate('directAccessLinks.error.noCreateUrlFnProvided', {
            defaultMessage:
              'This generator is not marked as deprecated. Please provide a createUrl fn.',
          })
        );
      }

      if (options.migrate && !options.createUrl) {
        const { id, state: newState } = await options.migrate(state);

        // eslint-disable-next-line
        console.warn(`URL generator is deprecated and may not work in future versions. Please migrate your data.`);

        if (!id || !newState) {
          throw new Error(
            i18n.translate('directAccessLinks.error.idStateUndefined', {
              defaultMessage: 'Generator id and/or state undefined when attempting to migrate',
            })
          );
        }

        return getGenerator(id!).createUrl(newState!);
      }

      if (!options.createUrl) {
        throw new Error(
          i18n.translate('directAccessLinks.error.invalidGenerator', {
            defaultMessage: 'Invalid generator',
          })
        );
      }

      return options.createUrl(state);
    },
    isDeprecated: !!options.isDeprecated,
    migrate: async (state: GeneratorStateMapping[Id]['State']) => {
      if (!options.isDeprecated) {
        throw new Error(
          i18n.translate('directAccessLinks.error.migrateCalledNotDeprecated', {
            defaultMessage: 'You cannot call migrate on a non-deprecated generator.',
          })
        );
      }

      if (!options.migrate) {
        throw new Error(noMigrationFnProvidedWarningText);
      }

      return options.migrate(state);
    },
  };
};
