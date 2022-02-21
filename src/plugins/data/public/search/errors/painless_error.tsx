/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSpacer, EuiText, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ApplicationStart } from 'kibana/public';
import { IEsError, isEsError } from './types';
import { EsError } from './es_error';
import { getRootCause } from './utils';
import { IndexPattern } from '../..';

export class PainlessError extends EsError {
  painlessStack?: string;
  indexPattern?: IndexPattern;
  constructor(err: IEsError, indexPattern?: IndexPattern) {
    super(err);
    this.indexPattern = indexPattern;
  }

  public getErrorMessage(application: ApplicationStart) {
    function onClick(indexPatternId?: string) {
      application.navigateToApp('management', {
        path: `/kibana/indexPatterns${indexPatternId ? `/patterns/${indexPatternId}` : ''}`,
      });
    }

    const rootCause = getRootCause(this.err);
    const scriptFromStackTrace = rootCause?.script_stack
      ? rootCause?.script_stack?.slice(-2).join('\n')
      : undefined;
    // if the error has been properly processed it will highlight where it occurred.
    const hasScript = rootCause?.script_stack?.slice(-1)[0]?.indexOf('HERE') || -1 >= 0;
    const humanReadableError = rootCause?.caused_by?.reason;
    // fallback, show ES stacktrace
    const painlessStack = rootCause?.script_stack ? rootCause?.script_stack.join('\n') : undefined;

    const indexPatternId = this?.indexPattern?.id;
    return (
      <>
        <EuiText size="s" data-test-subj="painlessScript">
          {i18n.translate('data.painlessError.painlessScriptedFieldErrorMessage', {
            defaultMessage:
              'Error executing runtime field or scripted field on index pattern {indexPatternName}',
            values: {
              indexPatternName: this?.indexPattern?.title,
            },
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        {scriptFromStackTrace || painlessStack ? (
          <EuiCodeBlock data-test-subj="painlessStackTrace" isCopyable={true} paddingSize="s">
            {hasScript ? scriptFromStackTrace : painlessStack}
          </EuiCodeBlock>
        ) : null}
        {humanReadableError ? (
          <EuiText data-test-subj="painlessHumanReadableError">{humanReadableError}</EuiText>
        ) : null}
        <EuiSpacer size="s" />
        <EuiSpacer size="s" />
        <EuiText textAlign="right">
          <EuiButton color="danger" onClick={() => onClick(indexPatternId)} size="s">
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
