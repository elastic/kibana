/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from 'react-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { Embeddable, IEmbeddable } from '..';

export class HelloWorldEmbeddable extends Embeddable {
  readonly type = 'hello-world';

  renderError: IEmbeddable['renderError'];

  reload() {}

  render(node: HTMLElement) {
    render(<EuiEmptyPrompt body={this.getTitle()} />, node);

    this.reload = this.render.bind(this, node);
  }

  setErrorRenderer(renderer: IEmbeddable['renderError']) {
    this.renderError = renderer;
  }

  updateOutput(...args: Parameters<Embeddable['updateOutput']>): void {
    return super.updateOutput(...args);
  }
}
