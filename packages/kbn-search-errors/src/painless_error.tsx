/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiSpacer, EuiText, EuiCodeBlock } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IEsError } from './types';
import { EsError, isEsError } from './es_error';
import { getRootCause } from './utils';

export class PainlessError extends EsError {
  painlessStack?: string;
  indexPattern?: DataView;
  constructor(err: IEsError, openInInspector: () => void, indexPattern?: DataView) {
    super(err, openInInspector);
    this.indexPattern = indexPattern;
  }

  public getErrorMessage() {
    const rootCause = getRootCause(this.err.attributes?.error);
    const scriptFromStackTrace = rootCause?.script_stack
      ? rootCause?.script_stack?.slice(-2).join('\n')
      : undefined;
    // if the error has been properly processed it will highlight where it occurred.
    const hasScript = rootCause?.script_stack?.slice(-1)[0]?.indexOf('HERE') || -1 >= 0;
    const humanReadableError = rootCause?.caused_by?.reason;
    // fallback, show ES stacktrace
    const painlessStack = rootCause?.script_stack ? rootCause?.script_stack.join('\n') : undefined;

    return (
      <>
        <EuiText size="s" data-test-subj="painlessScript">
          {i18n.translate('searchErrors.painlessError.painlessScriptedFieldErrorMessage', {
            defaultMessage:
              'Error executing runtime field or scripted field on index pattern {indexPatternName}',
            values: {
              indexPatternName: this?.indexPattern?.title,
            },
          })}
        </EuiText>
        <EuiSpacer size="s" />
        {scriptFromStackTrace || painlessStack ? (
          <EuiCodeBlock data-test-subj="painlessStackTrace" isCopyable={true} paddingSize="s">
            {hasScript ? scriptFromStackTrace : painlessStack}
          </EuiCodeBlock>
        ) : null}
        {humanReadableError ? (
          <EuiText size="s" data-test-subj="painlessHumanReadableError">
            {humanReadableError}
          </EuiText>
        ) : null}
      </>
    );
  }

  getActions(application: ApplicationStart) {
    function onClick(indexPatternId?: string) {
      application.navigateToApp('management', {
        path: `/kibana/indexPatterns${indexPatternId ? `/patterns/${indexPatternId}` : ''}`,
      });
    }
    const actions = super.getActions(application) ?? [];
    actions.push(
      <EuiButtonEmpty
        key="editPainlessScript"
        onClick={() => onClick(this?.indexPattern?.id)}
        size="s"
      >
        {i18n.translate('searchErrors.painlessError.buttonTxt', {
          defaultMessage: 'Edit script',
        })}
      </EuiButtonEmpty>
    );
    return actions;
  }
}

export function isPainlessError(err: Error | IEsError) {
  if (!isEsError(err)) return false;

  const rootCause = getRootCause((err as IEsError).attributes?.error);
  if (!rootCause) return false;

  const { lang } = rootCause;
  return lang === 'painless';
}
