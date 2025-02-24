/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiSpacer, EuiText, EuiCodeBlock } from '@elastic/eui';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import type { IEsError } from './types';
import { EsError } from './es_error';

export class PainlessError extends EsError {
  private readonly applicationStart: ApplicationStart;
  private readonly painlessCause: estypes.ErrorCause;
  private readonly dataView?: AbstractDataView;

  constructor(
    err: IEsError,
    openInInspector: () => void,
    painlessCause: estypes.ErrorCause,
    applicationStart: ApplicationStart,
    dataView?: AbstractDataView
  ) {
    super(
      err,
      i18n.translate('searchErrors.painlessError.painlessScriptedFieldErrorMessage', {
        defaultMessage:
          'Error executing runtime field or scripted field on data view {indexPatternName}',
        values: {
          indexPatternName: dataView?.title || '',
        },
      }),
      openInInspector
    );
    this.applicationStart = applicationStart;
    this.painlessCause = painlessCause;
    this.dataView = dataView;
  }

  public getErrorMessage() {
    const scriptFromStackTrace = this.painlessCause?.script_stack
      ? this.painlessCause?.script_stack?.slice(-2).join('\n')
      : undefined;
    // if the error has been properly processed it will highlight where it occurred.
    const hasScript = this.painlessCause?.script_stack?.slice(-1)[0]?.indexOf('HERE') || -1 >= 0;
    const humanReadableError = this.painlessCause?.caused_by?.reason;
    // fallback, show ES stacktrace
    const painlessStack = this.painlessCause?.script_stack
      ? this.painlessCause?.script_stack.join('\n')
      : undefined;

    return (
      <div>
        <EuiText size="s" data-test-subj="painlessScript">
          {this.message}
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
      </div>
    );
  }

  getActions() {
    const actions = super.getActions() ?? [];
    actions.push(
      <EuiButtonEmpty
        key="editPainlessScript"
        onClick={() => () => {
          const dataViewId = this.dataView?.id;
          this.applicationStart.navigateToApp('management', {
            path: `/kibana/indexPatterns${dataViewId ? `/patterns/${dataViewId}` : ''}`,
          });
        }}
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
