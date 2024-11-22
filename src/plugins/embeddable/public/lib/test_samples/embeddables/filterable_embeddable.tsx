/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IContainer } from '../../containers';
import { EmbeddableOutput, EmbeddableInput, Embeddable } from '../../embeddables';

/** @internal */
export interface MockFilter {
  $state?: {};
  meta: {};
  query?: {};
}

export const FILTERABLE_EMBEDDABLE = 'FILTERABLE_EMBEDDABLE';

export interface FilterableEmbeddableInput extends EmbeddableInput {
  filters: MockFilter[];
}

export class FilterableEmbeddable extends Embeddable<FilterableEmbeddableInput, EmbeddableOutput> {
  public readonly type = FILTERABLE_EMBEDDABLE;
  constructor(initialInput: FilterableEmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  public getInspectorAdapters(): Record<string, string> {
    const inspectorAdapters: Record<string, string> = {
      filters: `My filters are ${JSON.stringify(this.input.filters)}`,
    };
    return inspectorAdapters;
  }

  public render() {}

  public reload() {}
}
