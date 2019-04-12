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

import {
  FilterableEmbeddable,
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from './filterable_embeddable';
import {
  EmbeddableInput,
  EmbeddableOutput,
  embeddableFactories,
  EmbeddableFactory,
} from '../../embeddables';
import { Container, ContainerInput, ContainerOutput } from '../../containers';

export class FilterableEmbeddableFactory extends EmbeddableFactory<FilterableEmbeddableInput> {
  constructor() {
    super({
      name: FILTERABLE_EMBEDDABLE,
    });
  }

  public getOutputSpec() {
    return {};
  }

  public create<
    CEI extends Partial<EmbeddableInput> = {},
    EO extends EmbeddableOutput = EmbeddableOutput,
    CI extends ContainerInput = ContainerInput,
    CO extends ContainerOutput = ContainerOutput
  >(initialInput: FilterableEmbeddableInput, parent?: Container<CEI, EO, CI, CO>) {
    return Promise.resolve(new FilterableEmbeddable(initialInput, parent));
  }
}

embeddableFactories.registerFactory(new FilterableEmbeddableFactory());
