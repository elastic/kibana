/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { UrlGeneratorsStart } from './url_generator_service';
import {
  UrlGeneratorStateMapping,
  UrlGeneratorId,
  UrlGeneratorsDefinition,
} from './url_generator_definition';
import { UrlGeneratorContract } from './url_generator_contract';

export class UrlGeneratorInternal<Id extends UrlGeneratorId> {
  constructor(
    private spec: UrlGeneratorsDefinition<Id>,
    private getGenerator: UrlGeneratorsStart['getUrlGenerator']
  ) {
    if (spec.isDeprecated && !spec.migrate) {
      throw new Error(
        i18n.translate('share.urlGenerators.error.noMigrationFnProvided', {
          defaultMessage:
            'If the access link generator is marked as deprecated, you must provide a migration function.',
        })
      );
    }

    if (!spec.isDeprecated && spec.migrate) {
      throw new Error(
        i18n.translate('share.urlGenerators.error.migrationFnGivenNotDeprecated', {
          defaultMessage:
            'If you provide a migration function, you must mark this generator as deprecated',
        })
      );
    }

    if (!spec.createUrl && !spec.isDeprecated) {
      throw new Error(
        i18n.translate('share.urlGenerators.error.noCreateUrlFnProvided', {
          defaultMessage:
            'This generator is not marked as deprecated. Please provide a createUrl fn.',
        })
      );
    }

    if (spec.createUrl && spec.isDeprecated) {
      throw new Error(
        i18n.translate('share.urlGenerators.error.createUrlFnProvided', {
          defaultMessage: 'This generator is marked as deprecated. Do not supply a createUrl fn.',
        })
      );
    }
  }

  getPublicContract(): UrlGeneratorContract<Id> {
    return {
      id: this.spec.id,
      createUrl: async (state: UrlGeneratorStateMapping[Id]['State']) => {
        if (this.spec.migrate && !this.spec.createUrl) {
          const { id, state: newState } = await this.spec.migrate(state);

          // eslint-disable-next-line
          console.warn(`URL generator is deprecated and may not work in future versions. Please migrate your data.`);

          return this.getGenerator(id!).createUrl(newState!);
        }

        return this.spec.createUrl!(state);
      },
      isDeprecated: !!this.spec.isDeprecated,
      migrate: async (state: UrlGeneratorStateMapping[Id]['State']) => {
        if (!this.spec.isDeprecated) {
          throw new Error(
            i18n.translate('share.urlGenerators.error.migrateCalledNotDeprecated', {
              defaultMessage: 'You cannot call migrate on a non-deprecated generator.',
            })
          );
        }

        return this.spec.migrate!(state);
      },
    };
  }
}
