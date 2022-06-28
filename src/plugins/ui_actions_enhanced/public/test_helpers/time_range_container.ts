/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ContainerInput,
  Container,
  ContainerOutput,
  EmbeddableStart,
} from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';

/**
 * interfaces are not allowed to specify a sub-set of the required types until
 * https://github.com/microsoft/TypeScript/issues/15300 is fixed so we use a type
 * here instead
 */
export type InheritedChildrenInput = {
  timeRange: TimeRange;
  id?: string;
};

interface ContainerTimeRangeInput extends ContainerInput<InheritedChildrenInput> {
  timeRange: TimeRange;
}

const TIME_RANGE_CONTAINER = 'TIME_RANGE_CONTAINER';

export class TimeRangeContainer extends Container<
  InheritedChildrenInput,
  ContainerTimeRangeInput,
  ContainerOutput
> {
  public readonly type = TIME_RANGE_CONTAINER;
  constructor(
    initialInput: ContainerTimeRangeInput,
    getFactory: EmbeddableStart['getEmbeddableFactory'],
    parent?: Container
  ) {
    super(initialInput, { embeddableLoaded: {} }, getFactory, parent);
  }

  public getInheritedInput() {
    return { timeRange: this.input.timeRange };
  }

  public render() {}

  public reload() {}
}
