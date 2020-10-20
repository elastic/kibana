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
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSpacer, EuiText, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import { KbnError } from '../../../../kibana_utils/common';
import { EsError, isEsError } from './types';
import { IKibanaSearchRequest } from '..';

export class PainlessError extends KbnError {
  painlessStack?: string;
  constructor(err: EsError, request: IKibanaSearchRequest) {
    const rootCause = getRootCause(err as EsError);

    super(
      i18n.translate('data.painlessError.painlessScriptedFieldErrorMessage', {
        defaultMessage: "Error executing Painless script: '{script}'.",
        values: { script: rootCause?.script },
      })
    );
    this.painlessStack = rootCause?.script_stack ? rootCause?.script_stack.join('\n') : undefined;
  }

  public getErrorMessage(application: ApplicationStart) {
    function onClick() {
      application.navigateToApp('management', {
        path: `/kibana/indexPatterns`,
      });
    }

    return (
      <>
        {this.message}
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        {this.painlessStack ? (
          <EuiCodeBlock data-test-subj="painlessStackTrace" isCopyable={true} paddingSize="s">
            {this.painlessStack}
          </EuiCodeBlock>
        ) : null}
        <EuiText textAlign="right">
          <EuiButton color="danger" onClick={onClick} size="s">
            <FormattedMessage id="data.painlessError.buttonTxt" defaultMessage="Edit script" />
          </EuiButton>
        </EuiText>
      </>
    );
  }
}

function getFailedShards(err: EsError) {
  const failedShards =
    err.body?.attributes?.error?.failed_shards ||
    err.body?.attributes?.error?.caused_by?.failed_shards;
  return failedShards ? failedShards[0] : undefined;
}

function getRootCause(err: EsError) {
  return getFailedShards(err)?.reason;
}

export function isPainlessError(err: Error | EsError) {
  if (!isEsError(err)) return false;

  const rootCause = getRootCause(err as EsError);
  if (!rootCause) return false;

  const { lang } = rootCause;
  return lang === 'painless';
}
