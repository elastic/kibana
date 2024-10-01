/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import { ContainerInput, Container, ContainerOutput, EmbeddableStart } from '../../..';

/**
 * interfaces are not allowed to specify a sub-set of the required types until
 * https://github.com/microsoft/TypeScript/issues/15300 is fixed so we use a type
 * here instead
 */
type InheritedChildrenInput = {
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

  public getAllDataViews() {
    return [];
  }

  public getInheritedInput() {
    return { timeRange: this.input.timeRange };
  }

  public render() {}

  public reload() {}
}
