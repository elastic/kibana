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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import {
  DirectAccessLinkGeneratorId,
  DirectAccessLinkSpec,
} from './direct_access_link_generator_spec';
import { DirectAccessLinkGeneratorInternal } from './direct_access_link_generator_internal';
import { DirectAccessLinkGeneratorContract } from './direct_access_link_generator_contract';

export interface DirectAccessLinksStart {
  getAccessLinkGenerator: (
    urlGeneratorId: DirectAccessLinkGeneratorId
  ) => DirectAccessLinkGeneratorContract<DirectAccessLinkGeneratorId>;
}

export interface DirectAccessLinksSetup {
  registerAccessLinkGenerator: <Id extends DirectAccessLinkGeneratorId>(
    generator: DirectAccessLinkSpec<Id>
  ) => void;
}

export class DirectAccessLinksPlugin
  implements Plugin<DirectAccessLinksSetup, DirectAccessLinksStart> {
  // Unfortunate use of any here, but I haven't figured out how to type this any better without
  // getting warnings.
  private accessLinkGenerators: Map<string, DirectAccessLinkGeneratorInternal<any>> = new Map();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const setup: DirectAccessLinksSetup = {
      registerAccessLinkGenerator: <Id extends DirectAccessLinkGeneratorId>(
        generatorOptions: DirectAccessLinkSpec<Id>
      ) => {
        this.accessLinkGenerators.set(
          generatorOptions.id,
          new DirectAccessLinkGeneratorInternal<Id>(generatorOptions, this.getAccessLinkGenerator)
        );
      },
    };
    return setup;
  }

  public start(core: CoreStart) {
    const start: DirectAccessLinksStart = {
      getAccessLinkGenerator: this.getAccessLinkGenerator,
    };
    return start;
  }

  public stop() {}

  private readonly getAccessLinkGenerator = (id: DirectAccessLinkGeneratorId) => {
    const generator = this.accessLinkGenerators.get(id);
    if (!generator) {
      throw new Error(
        i18n.translate('directAccessLinks.errors.noGeneratorWithId', {
          defaultMessage: 'No generator found with id {id}',
          values: { id },
        })
      );
    } else {
      return generator.getPublicContract();
    }
  };
}
