/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { ApplicationStart } from '@kbn/core/public';
import { KbnError } from '@kbn/kibana-utils-plugin/common';

export enum TimeoutErrorMode {
  CONTACT,
  CHANGE,
}

/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 */
export class SearchTimeoutError extends KbnError {
  public mode: TimeoutErrorMode;
  constructor(err: Record<string, any>, mode: TimeoutErrorMode) {
    super(`Request timeout: ${JSON.stringify(err?.message)}`);
    this.mode = mode;
  }

  private getMessage() {
    switch (this.mode) {
      case TimeoutErrorMode.CONTACT:
        return i18n.translate('data.search.timeoutContactAdmin', {
          defaultMessage:
            'Your query has timed out. Contact your system administrator to increase the run time.',
        });
      case TimeoutErrorMode.CHANGE:
        return i18n.translate('data.search.timeoutIncreaseSetting', {
          defaultMessage:
            'Your query has timed out. Increase run time with the search timeout advanced setting.',
        });
    }
  }

  private getActionText() {
    switch (this.mode) {
      case TimeoutErrorMode.CHANGE:
        return i18n.translate('data.search.timeoutIncreaseSettingActionText', {
          defaultMessage: 'Edit setting',
        });
        break;
    }
  }

  private onClick(application: ApplicationStart) {
    switch (this.mode) {
      case TimeoutErrorMode.CHANGE:
        application.navigateToApp('management', {
          path: `/kibana/settings`,
        });
        break;
    }
  }

  public getErrorMessage(application: ApplicationStart) {
    const actionText = this.getActionText();
    return (
      <>
        {this.getMessage()}
        {actionText && (
          <>
            <EuiSpacer size="s" />
            <EuiText textAlign="right">
              <EuiButton
                color="danger"
                onClick={() => this.onClick(application)}
                size="s"
                data-test-subj="searchTimeoutError"
              >
                {actionText}
              </EuiButton>
            </EuiText>
          </>
        )}
      </>
    );
  }
}
