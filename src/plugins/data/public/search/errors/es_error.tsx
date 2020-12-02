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
