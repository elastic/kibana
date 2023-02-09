/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';

import { EuiLoadingChart } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Embeddable, type EmbeddableInput, type IContainer } from '@kbn/embeddable-plugin/public';

import { PLACEHOLDER_EMBEDDABLE } from '.';
import { pluginServices } from '../services/plugin_services';

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

    const {
      settings: {
        theme: { theme$ },
      },
    } = pluginServices.getServices();

    const classes = classNames('embPanel', 'embPanel-isLoading');
    ReactDOM.render(
      <KibanaThemeProvider theme$={theme$}>
        <div className={classes}>
          <EuiLoadingChart size="l" mono />
        </div>
      </KibanaThemeProvider>,
      node
    );
  }

  public reload() {}
}
