/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { UrlGeneratorId, UrlGeneratorsDefinition } from './url_generator_definition';
import { UrlGeneratorInternal } from './url_generator_internal';
import { UrlGeneratorContract } from './url_generator_contract';

export interface UrlGeneratorsStart {
  /**
   * @deprecated
   *
   * URL Generators are deprecated, use URL locators in UrlService instead.
   */
  getUrlGenerator: <T extends UrlGeneratorId>(urlGeneratorId: T) => UrlGeneratorContract<T>;
}

export interface UrlGeneratorsSetup {
  /**
   * @deprecated
   *
   * URL Generators are deprecated, use URL locators in UrlService instead.
   */
  registerUrlGenerator: <Id extends UrlGeneratorId>(
    generator: UrlGeneratorsDefinition<Id>
  ) => UrlGeneratorContract<Id>;
}

export class UrlGeneratorsService implements Plugin<UrlGeneratorsSetup, UrlGeneratorsStart> {
  // Unfortunate use of any here, but I haven't figured out how to type this any better without
  // getting warnings.
  private urlGenerators: Map<string, UrlGeneratorInternal<any>> = new Map();

  constructor() {}

  public setup(core: CoreSetup) {
    const setup: UrlGeneratorsSetup = {
      registerUrlGenerator: <Id extends UrlGeneratorId>(
        generatorOptions: UrlGeneratorsDefinition<Id>
      ) => {
        const generator = new UrlGeneratorInternal<Id>(generatorOptions, this.getUrlGenerator);
        this.urlGenerators.set(generatorOptions.id, generator);
        return generator.getPublicContract();
      },
    };
    return setup;
  }

  public start(core: CoreStart) {
    const start: UrlGeneratorsStart = {
      getUrlGenerator: this.getUrlGenerator,
    };
    return start;
  }

  public stop() {}

  private readonly getUrlGenerator = (id: UrlGeneratorId) => {
    const generator = this.urlGenerators.get(id);
    if (!generator) {
      throw new Error(
        i18n.translate('share.urlGenerators.errors.noGeneratorWithId', {
          defaultMessage: 'No generator found with id {id}',
          values: { id },
        })
      );
    }
    return generator.getPublicContract();
  };
}
