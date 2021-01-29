/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSpacer, EuiText, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import { IEsError, isEsError } from './types';
import { EsError } from './es_error';
import { getRootCause } from './utils';

export class PainlessError extends EsError {
  painlessStack?: string;
  constructor(err: IEsError) {
    super(err);
  }

  public getErrorMessage(application: ApplicationStart) {
    function onClick() {
      application.navigateToApp('management', {
        path: `/kibana/indexPatterns`,
      });
    }

    const rootCause = getRootCause(this.err);
    const painlessStack = rootCause?.script_stack ? rootCause?.script_stack.join('\n') : undefined;

    return (
      <>
        {i18n.translate('data.painlessError.painlessScriptedFieldErrorMessage', {
          defaultMessage: "Error executing Painless script: '{script}'.",
          values: { script: rootCause?.script },
        })}
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        {painlessStack ? (
          <EuiCodeBlock data-test-subj="painlessStackTrace" isCopyable={true} paddingSize="s">
            {painlessStack}
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

export function isPainlessError(err: Error | IEsError) {
  if (!isEsError(err)) return false;

  const rootCause = getRootCause(err as IEsError);
  if (!rootCause) return false;

  const { lang } = rootCause;
  return lang === 'painless';
}
