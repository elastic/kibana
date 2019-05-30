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

import { SavedObjectAttributes } from '../../../../server/saved_objects';
import { EmbeddableFactory } from './embeddable_factory';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { EmbeddableFactoryNotFoundError } from './embeddable_factory_not_found_error';

export class EmbeddableFactoryRegistry {
  private factories: { [key: string]: EmbeddableFactory<any, any, any, any> } = {};

  public registerFactory<
    TEmbeddableInput extends EmbeddableInput = EmbeddableInput,
    TEmbeddableOutput extends EmbeddableOutput = EmbeddableOutput,
    TEmbeddable extends IEmbeddable<TEmbeddableInput, TEmbeddableOutput> = IEmbeddable<
      TEmbeddableInput,
      TEmbeddableOutput
    >,
    TSavedObjectAttributes extends SavedObjectAttributes = SavedObjectAttributes
  >(
    factory: EmbeddableFactory<
      TEmbeddableInput,
      TEmbeddableOutput,
      TEmbeddable,
      TSavedObjectAttributes
    >
  ) {
    this.factories[factory.type] = factory;
  }

  public getFactoryByName<TEmbeddableFactory extends EmbeddableFactory = EmbeddableFactory>(
    type: string
  ): TEmbeddableFactory {
    if (this.factories[type] === undefined) {
      throw new EmbeddableFactoryNotFoundError(type);
    }
    return this.factories[type] as TEmbeddableFactory;
  }

  public getFactories() {
    return this.factories;
  }

  public reset() {
    this.factories = {};
  }
}

export const embeddableFactories = new EmbeddableFactoryRegistry();
