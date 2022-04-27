/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiText, EuiEmptyPrompt } from '@elastic/eui';
import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider, Markdown } from '@kbn/kibana-react-plugin/public';
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
  private actions: ReactNode;

  constructor(
    error: Error | string,
    input: EmbeddableInput,
    parent?: IContainer,
    actions?: ReactNode
  ) {
    super(input, {}, parent);
    this.error = error;
    this.actions = actions;
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
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        data-test-subj="embeddableStackError"
        body={
          <EuiText color="subdued" size="xs">
            <Markdown
              markdown={title}
              openLinksInNewTab={true}
              data-test-subj="errorMessageMarkdown"
            />
          </EuiText>
        }
        actions={this.actions}
      />
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
