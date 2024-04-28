/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';

import {
  FilterDebuggerEmbeddableInput,
  FILTER_DEBUGGER_EMBEDDABLE,
} from './filter_debugger_embeddable_factory';
import { FilterDebuggerEmbeddableComponent } from './filter_debugger_embeddable_component';

export class FilterDebuggerEmbeddable extends Embeddable<FilterDebuggerEmbeddableInput> {
  public readonly type = FILTER_DEBUGGER_EMBEDDABLE;

  private root?: ReturnType<typeof createRoot> | null;

  constructor(initialInput: FilterDebuggerEmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  public render(node: HTMLElement) {
    if (this.root) {
      this.root.unmount();
    }
    this.root = createRoot(node);
    this.root.render(<FilterDebuggerEmbeddableComponent embeddable={this} />);
  }

  public reload() {}

  public destroy() {
    super.destroy();
    if (this.root) this.root.unmount();
  }
}
