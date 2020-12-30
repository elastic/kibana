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

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { UrlGeneratorId, UrlGeneratorsDefinition } from './url_generator_definition';
import { UrlGeneratorInternal } from './url_generator_internal';
import { UrlGeneratorContract } from './url_generator_contract';

export interface UrlGeneratorsStart {
  getUrlGenerator: <T extends UrlGeneratorId>(urlGeneratorId: T) => UrlGeneratorContract<T>;
}

export interface UrlGeneratorsSetup {
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
