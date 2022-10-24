/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import { Embeddable } from './embeddable';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { IContainer } from '../containers';

export const ERROR_EMBEDDABLE_TYPE = 'error';

export function isErrorEmbeddable<TEmbeddable extends IEmbeddable>(
  embeddable: TEmbeddable | ErrorEmbeddable
): embeddable is ErrorEmbeddable {
  return Boolean(embeddable.fatalError || (embeddable as ErrorEmbeddable).error !== undefined);
}

export class ErrorEmbeddable extends Embeddable<EmbeddableInput, EmbeddableOutput, ReactNode> {
  public readonly type = ERROR_EMBEDDABLE_TYPE;
  public error: Error | string;

  constructor(error: Error | string, input: EmbeddableInput, parent?: IContainer) {
    super(input, {}, parent);
    this.error = error;
  }

  public reload() {}

  public render() {
    const title = typeof this.error === 'string' ? this.error : this.error.message;
    const body = (
      <Markdown markdown={title} openLinksInNewTab={true} data-test-subj="errorMessageMarkdown" />
    );

    return (
      <div className="embPanel__content" data-test-subj="embeddableStackError">
        <EuiEmptyPrompt
          className="embPanel__error"
          iconType="alert"
          iconColor="danger"
          body={body}
        />
      </div>
    );
  }
}
