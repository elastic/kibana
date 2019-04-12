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
import { EmbeddableOutput, EmbeddableFactoryRegistry } from '../../embeddables';
import { Filter } from '../../types';
import { Container, ContainerInput } from '../../containers';

export const FILTERABLE_CONTAINER = 'FILTERABLE_CONTAINER';

export interface FilterableContainerInput extends ContainerInput {
  filters: Filter[];
}

export interface InheritedChildrenInput {
  filters: Filter[];
  id?: string;
}

export class FilterableContainer extends Container<
  InheritedChildrenInput,
  EmbeddableOutput,
  FilterableContainerInput
> {
  constructor(
    initialInput: FilterableContainerInput,
    embeddableFactories: EmbeddableFactoryRegistry,
    parent?: Container
  ) {
    super(
      FILTERABLE_CONTAINER,
      initialInput,
      { embeddableLoaded: {} },
      embeddableFactories,
      parent
    );
  }

  public getInheritedInput() {
    return {
      filters: this.input.filters,
    };
  }

  public render() {}
}
