/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiText, EuiIcon, EuiSpacer } from '@elastic/eui';
import { Markdown } from '../../../../kibana_react/public';
import { Embeddable } from './embeddable';
import { EmbeddableInput, IEmbeddable } from './i_embeddable';
import { IContainer } from '../containers';

export const ERROR_EMBEDDABLE_TYPE = 'error';

export function isErrorEmbeddable<TEmbeddable extends IEmbeddable>(
  embeddable: TEmbeddable | ErrorEmbeddable
): embeddable is ErrorEmbeddable {
  return Boolean(embeddable.fatalError || (embeddable as ErrorEmbeddable).error !== undefined);
}

export class ErrorEmbeddable extends Embeddable {
  public readonly type = ERROR_EMBEDDABLE_TYPE;
  private dom?: HTMLElement;

  constructor(
    public error: Error | string | JSX.Element,
    input: EmbeddableInput,
    parent?: IContainer
  ) {
    super(input, {}, parent);
    this.error = error;
  }

  public reload() {}

  public render(dom: HTMLElement) {
    let body: JSX.Element | null = null;

    if (typeof this.error === 'string' || this.error instanceof Error) {
      const title = typeof this.error === 'string' ? this.error : this.error.message;

      body = (
        <Markdown markdown={title} openLinksInNewTab={true} data-test-subj="errorMessageMarkdown" />
      );
    } else if (React.isValidElement(this.error)) {
      body = this.error;
    }

    this.dom = dom;
    ReactDOM.render(
      // @ts-ignore
      <div className="embPanel__error embPanel__content" data-test-subj="embeddableStackError">
        <EuiText color="subdued" size="xs">
          <EuiIcon type="alert" color="danger" />
          <EuiSpacer size="s" />
          {body}
        </EuiText>
      </div>,
      dom
    );
  }

  public destroy() {
    if (this.dom) {
      ReactDOM.unmountComponentAtNode(this.dom);
    }
  }
}
