/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { ApplicationStart } from 'kibana/public';
import { KbnError } from '../../../../kibana_utils/common';
import { IEsError } from './types';
import { getRootCause, getTopLevelCause } from './utils';

export class EsError extends KbnError {
  readonly body: IEsError['body'];

  constructor(protected readonly err: IEsError) {
    super('EsError');
    this.body = err.body;
  }

  public getErrorMessage(application: ApplicationStart) {
    const rootCause = getRootCause(this.err)?.reason;
    const topLevelCause = getTopLevelCause(this.err)?.reason;
    const cause = rootCause ?? topLevelCause;

    return (
      <>
        <EuiSpacer size="s" />
        {cause ? (
          <EuiCodeBlock data-test-subj="errMessage" isCopyable={true} paddingSize="s">
            {cause}
          </EuiCodeBlock>
        ) : null}
      </>
    );
  }
}
