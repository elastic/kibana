/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiLoadingChart } from '@elastic/eui';
import classNames from 'classnames';
import { Embeddable, EmbeddableInput, IContainer } from '../../../services/embeddable';

export const PLACEHOLDER_EMBEDDABLE = 'placeholder';

export class PlaceholderEmbeddable extends Embeddable {
  public readonly type = PLACEHOLDER_EMBEDDABLE;
  private node?: HTMLElement;

  constructor(initialInput: EmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
    this.input = initialInput;
  }
  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    const classes = classNames('embPanel', 'embPanel-isLoading');
    ReactDOM.render(
      <div className={classes}>
        <EuiLoadingChart size="l" mono />
      </div>,
      node
    );
  }

  public reload() {}
}
