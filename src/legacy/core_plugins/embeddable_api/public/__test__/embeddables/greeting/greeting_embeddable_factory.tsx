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

import React from 'react';
import { embeddableFactories, EmbeddableFactory } from 'plugins/embeddable_api/index';
import { Container } from 'plugins/embeddable_api/containers';
import { i18n } from '@kbn/i18n';
import { getNewPlatform } from 'ui/new_platform';
import { GreetingEmbeddable, GreetingEmbeddableInput } from './greeting_embeddable';
import { GreetingInitializer } from './greeting_initializer';

export const GREETING_EMBEDDABLE = 'GREETING_EMBEDDABLE';

export class GreetingEmbeddableFactory extends EmbeddableFactory<GreetingEmbeddableInput> {
  constructor() {
    super({
      name: GREETING_EMBEDDABLE,
    });
  }

  public isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('kbn.embeddable.samples.greeting.displayName', {
      defaultMessage: 'greeting card',
    });
  }

  public getExplicitInput(): Promise<Partial<GreetingEmbeddableInput>> {
    return new Promise(resolve => {
      const modalSession = getNewPlatform().start.core.overlays.openModal(
        <GreetingInitializer
          onCancel={() => {
            modalSession.close();
            resolve(undefined);
          }}
          onCreate={(input: { firstName: string; lastName: string }) => {
            modalSession.close();
            resolve(input);
          }}
        />,
        {
          'data-test-subj': 'createGreetingEmbeddable',
        }
      );
    });
  }

  public async create(initialInput: GreetingEmbeddableInput, parent?: Container) {
    return Promise.resolve(new GreetingEmbeddable(initialInput, parent));
  }
}

embeddableFactories.registerFactory(new GreetingEmbeddableFactory());
