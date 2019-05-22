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

import { EuiCallOut } from '@elastic/eui';
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

  constructor(error: Error | string, input: EmbeddableInput, parent?: IContainer) {
    super(input, {}, parent);
    this.error = error;
  }

  public reload() {}

  public render(dom: React.ReactNode) {
    const title = typeof this.error === 'string' ? this.error : this.error.message;
    const stack = typeof this.error === 'string' ? '' : this.error.stack;
    ReactDOM.render(
      // @ts-ignore
      <EuiCallOut title={title} color="danger" data-test-subj="embeddableStackError">
        {stack}
      </EuiCallOut>,
      dom
    );
  }
}
