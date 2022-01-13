/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiText, EuiIcon, EuiSpacer } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider, Markdown } from '../../../../kibana_react/public';
import { Embeddable } from './embeddable';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { IContainer } from '../containers';
import { getTheme } from '../../services';

export const ERROR_EMBEDDABLE_TYPE = 'error';

export function isErrorEmbeddable<TEmbeddable extends IEmbeddable>(
  embeddable: TEmbeddable | ErrorEmbeddable
): embeddable is ErrorEmbeddable {
  return Boolean(embeddable.fatalError || (embeddable as ErrorEmbeddable).error !== undefined);
}

export class ErrorEmbeddable extends Embeddable<EmbeddableInput, EmbeddableOutput> {
  public readonly type = ERROR_EMBEDDABLE_TYPE;
  public error: Error | string;
  private dom?: HTMLElement;

  constructor(error: Error | string, input: EmbeddableInput, parent?: IContainer) {
    super(input, {}, parent);
    this.error = error;
  }

  public reload() {}

  public render(dom: HTMLElement) {
    const title = typeof this.error === 'string' ? this.error : this.error.message;
    this.dom = dom;
    let theme;
    try {
      theme = getTheme();
    } catch (err) {
      theme = {};
    }
    const node = (
      <div className="embPanel__error embPanel__content" data-test-subj="embeddableStackError">
        <EuiText color="subdued" size="xs">
          <EuiIcon type="alert" color="danger" />
          <EuiSpacer size="s" />
          <Markdown
            markdown={title}
            openLinksInNewTab={true}
            data-test-subj="errorMessageMarkdown"
          />
        </EuiText>
      </div>
    );
    const content =
      theme && theme.theme$ ? (
        <KibanaThemeProvider theme$={theme.theme$}>{node}</KibanaThemeProvider>
      ) : (
        node
      );

    ReactDOM.render(content, dom);
  }

  public destroy() {
    if (this.dom) {
      ReactDOM.unmountComponentAtNode(this.dom);
    }
  }
}
