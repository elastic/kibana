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
import { Embeddable, EmbeddableInput, EmbeddableOutput } from './embeddable';

export const ERROR_EMBEDDABLE_TYPE = 'error';

export function isErrorEmbeddable(
  embeddable: Embeddable | ErrorEmbeddable
): embeddable is ErrorEmbeddable {
  return (embeddable as ErrorEmbeddable).getInput().error !== undefined;
}

interface ErrorInput extends EmbeddableInput {
  error: Error | string;
}

export class ErrorEmbeddable extends Embeddable<ErrorInput, EmbeddableOutput> {
  constructor(error: Error | string, id: string) {
    super(
      ERROR_EMBEDDABLE_TYPE,
      {
        error,
        id,
      },
      {}
    );
  }

  public render(dom: React.ReactNode) {
    const { error } = this.input;
    const title = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? '' : error.stack;
    ReactDOM.render(
      // @ts-ignore
      <EuiCallOut title={title} color="danger">
        {stack}
      </EuiCallOut>,
      dom
    );
  }
}
