/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Embeddable, EmbeddableOutput } from '@kbn/embeddable-plugin/public';

import { DisabledLabVisualization } from './disabled_lab_visualization';
import { VisualizeInput } from './visualize_embeddable';
import { VISUALIZE_EMBEDDABLE_TYPE } from './constants';
import { getTheme } from '../services';

export class DisabledLabEmbeddable extends Embeddable<VisualizeInput, EmbeddableOutput> {
  private domNode?: HTMLElement;
  private root?: Root;
  public readonly type = VISUALIZE_EMBEDDABLE_TYPE;

  constructor(private readonly title: string, initialInput: VisualizeInput) {
    super(initialInput, { title });
  }

  public reload() {}
  public render(domNode: HTMLElement) {
    if (this.title) {
      this.domNode = domNode;
      this.root = createRoot(this.domNode);
      this.root.render(
        <KibanaThemeProvider theme$={getTheme().theme$}>
          <DisabledLabVisualization title={this.title} />
        </KibanaThemeProvider>
      );
    }
  }

  public destroy() {
    if (this.domNode) {
      this.root?.unmount();
    }
  }
}
