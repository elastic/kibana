/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { type Filter, type Query } from '@kbn/es-query';
import { FilterDebuggerEmbeddable } from './filter_debugger_embeddable';

export const FILTER_DEBUGGER_EMBEDDABLE = 'filterDebuggerEmbeddable';
export interface FilterDebuggerEmbeddableInput extends EmbeddableInput {
  filters?: Filter[];
  query?: Query;
}

export type FilterDebuggerEmbeddableFactory = EmbeddableFactory;
export class FilterDebuggerEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = FILTER_DEBUGGER_EMBEDDABLE;

  public async isEditable() {
    return true;
  }

  public async create(initialInput: FilterDebuggerEmbeddableInput, parent?: IContainer) {
    return new FilterDebuggerEmbeddable(initialInput, parent);
  }

  public canCreateNew() {
    return true;
  }

  public getDisplayName() {
    return 'Filter debugger';
  }
}
