/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiText, EuiIcon, EuiSpacer } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { Embeddable } from './embeddable';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { IContainer } from '../containers';

export const ERROR_EMBEDDABLE_TYPE = 'error';

export function isErrorEmbeddable<TEmbeddable extends IEmbeddable>(
  embeddable: TEmbeddable | ErrorEmbeddable
): embeddable is ErrorEmbeddable {
  return (embeddable as ErrorEmbeddable).error !== undefined;
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
    ReactDOM.render(
      // @ts-ignore
      <div className="embPanel__error embPanel__content" data-test-subj="embeddableStackError">
        <EuiText color="subdued" size="xs">
          <EuiIcon type="alert" color="danger" />
          <EuiSpacer size="s" />
          {title}
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
