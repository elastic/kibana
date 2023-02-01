/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Embeddable, EmbeddableInput, IContainer } from '@kbn/embeddable-plugin/public';
import { compareFilters, COMPARE_ALL_OPTIONS, type Filter, type Query } from '@kbn/es-query';
import { distinctUntilChanged, Observable, skip, Subject, Subscription } from 'rxjs';
import { FilterDebuggerEmbeddableComponent } from './filter_debugger_embeddable_component';

export const FILTER_DEBUGGER_EMBEDDABLE = 'FILTER_DEBUGGER_EMBEDDABLE';

export interface FilterDebuggerEmbeddableInput extends EmbeddableInput {
  filters: Filter[];
  query: Query;
}

export class FilterDebuggerEmbeddable extends Embeddable<FilterDebuggerEmbeddableInput> {
  public readonly type = FILTER_DEBUGGER_EMBEDDABLE;

  private domNode?: HTMLElement;

  constructor(initialInput: FilterDebuggerEmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  public render(node: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = node;
    ReactDOM.render(<FilterDebuggerEmbeddableComponent embeddable={this} />, node);
  }

  public reload() {}

  public destroy() {
    super.destroy();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }
}
