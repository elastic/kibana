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

import { Container, ContainerInput } from '../../containers';
import { GetEmbeddableFactory } from '../../types';
import { Filter } from '../../../../../data/public';

export const FILTERABLE_CONTAINER = 'FILTERABLE_CONTAINER';

export interface FilterableContainerInput extends ContainerInput {
  filters: Filter[];
}

/**
 * interfaces are not allowed to specify a sub-set of the required types until
 * https://github.com/microsoft/TypeScript/issues/15300 is fixed so we use a type
 * here instead
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InheritedChildrenInput = {
  filters: Filter[];
  id?: string;
};

export class FilterableContainer extends Container<
  InheritedChildrenInput,
  FilterableContainerInput
> {
  public readonly type = FILTERABLE_CONTAINER;

  constructor(
    initialInput: FilterableContainerInput,
    getFactory: GetEmbeddableFactory,
    parent?: Container
  ) {
    super(initialInput, { embeddableLoaded: {} }, getFactory, parent);
  }

  public getInheritedInput() {
    return {
      filters: this.input.filters,
      viewMode: this.input.viewMode,
    };
  }

  public render() {}
}
