/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Container, ContainerInput } from '../../containers';
import { EmbeddableStart } from '../../../plugin';
import { MockFilter } from './filterable_embeddable';

export const FILTERABLE_CONTAINER = 'FILTERABLE_CONTAINER';

export interface FilterableContainerInput extends ContainerInput {
  filters: MockFilter[];
}

/**
 * interfaces are not allowed to specify a sub-set of the required types until
 * https://github.com/microsoft/TypeScript/issues/15300 is fixed so we use a type
 * here instead
 */
export type InheritedChildrenInput = {
  filters: MockFilter[];
  id?: string;
};

export class FilterableContainer extends Container<
  InheritedChildrenInput,
  FilterableContainerInput
> {
  public readonly type = FILTERABLE_CONTAINER;

  constructor(
    initialInput: FilterableContainerInput,
    getFactory: EmbeddableStart['getEmbeddableFactory'],
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
