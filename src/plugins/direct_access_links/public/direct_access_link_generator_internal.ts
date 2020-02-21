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
import {
  DirectAccessLinkGeneratorStateMapping,
  DirectAccessLinkGeneratorId,
  DirectAccessLinkSpec,
} from './direct_access_link_generator_spec';
import { DirectAccessLinkGeneratorContract } from './direct_access_link_generator_contract';

const noMigrationFnProvidedWarningText = i18n.translate(
  'directAccessLinks.error.noMigrationFnProvided',
  {
    defaultMessage:
      'If the access link generator is marked as deprecated, you must provide a migration function.',
  }
);

export class DirectAccessLinkGeneratorInternal<Id extends DirectAccessLinkGeneratorId> {
  constructor(
    private spec: DirectAccessLinkSpec<Id>,
    private getGenerator: DirectAccessLinksStart['getAccessLinkGenerator']
  ) {
    if (spec.isDeprecated && !spec.migrate) {
      throw new Error(noMigrationFnProvidedWarningText);
    }

    if (!spec.isDeprecated && spec.migrate) {
      throw new Error(
        i18n.translate('directAccessLinks.error.migrationFnGivenNotDeprecated', {
          defaultMessage:
            'If you provide a migration function, you must mark this generator as deprecated',
        })
      );
    }

    if (!spec.createUrl && !spec.isDeprecated) {
      throw new Error(
        i18n.translate('directAccessLinks.error.noCreateUrlFnProvided', {
          defaultMessage:
            'This generator is not marked as deprecated. Please provide a createUrl fn.',
        })
      );
    }

    if (spec.createUrl && spec.isDeprecated) {
      throw new Error(
        i18n.translate('directAccessLinks.error.createUrlFnProvided', {
          defaultMessage: 'This generator is marked as deprecated. Do not supply a createUrl fn.',
        })
      );
    }
  }

  getPublicContract(): DirectAccessLinkGeneratorContract<Id> {
    return {
      id: this.spec.id,
      createUrl: async (state: DirectAccessLinkGeneratorStateMapping[Id]['State']) => {
        if (this.spec.createUrl && this.spec.isDeprecated) {
          throw new Error(
            i18n.translate('directAccessLinks.error.createUrlFnProvided', {
              defaultMessage:
                'This generator is marked as deprecated. Do not supply a createUrl fn.',
            })
          );
        }

        if (!this.spec.createUrl && !this.spec.isDeprecated) {
          throw new Error(
            i18n.translate('directAccessLinks.error.noCreateUrlFnProvided', {
              defaultMessage:
                'This generator is not marked as deprecated. Please provide a createUrl fn.',
            })
          );
        }

        if (this.spec.migrate && !this.spec.createUrl) {
          const { id, state: newState } = await this.spec.migrate(state);

          // eslint-disable-next-line
        console.warn(`URL generator is deprecated and may not work in future versions. Please migrate your data.`);

          if (!id || !newState) {
            throw new Error(
              i18n.translate('directAccessLinks.error.idStateUndefined', {
                defaultMessage: 'Generator id and/or state undefined when attempting to migrate',
              })
            );
          }

          return this.getGenerator(id!).createUrl(newState!);
        }

        if (!this.spec.createUrl) {
          throw new Error(
            i18n.translate('directAccessLinks.error.invalidGenerator', {
              defaultMessage: 'Invalid generator',
            })
          );
        }

        return this.spec.createUrl(state);
      },
      isDeprecated: !!this.spec.isDeprecated,
      migrate: async (state: DirectAccessLinkGeneratorStateMapping[Id]['State']) => {
        if (!this.spec.isDeprecated) {
          throw new Error(
            i18n.translate('directAccessLinks.error.migrateCalledNotDeprecated', {
              defaultMessage: 'You cannot call migrate on a non-deprecated generator.',
            })
          );
        }

        if (!this.spec.migrate) {
          throw new Error(noMigrationFnProvidedWarningText);
        }

        return this.spec.migrate(state);
      },
    };
  }
}
