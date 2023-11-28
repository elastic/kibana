/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import { IEsError } from './types';
import { getRootCause } from './utils';

/**
 * Checks if a given errors originated from Elasticsearch.
 * Those params are assigned to the attributes property of an error.
 *
 * @param e
 */
export function isEsError(e: any): e is IEsError {
  return !!e.attributes;
}

export class EsError extends Error {
  readonly attributes: IEsError['attributes'];

  constructor(protected readonly err: IEsError, private readonly openInInspector: () => void) {
    super(
      `EsError: ${
        getRootCause(err?.attributes?.error)?.reason ||
        i18n.translate('searchErrors.esError.unknownRootCause', { defaultMessage: 'unknown' })
      }`
    );
    this.attributes = err.attributes;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public getErrorMessage() {
    if (!this.attributes?.error) {
      return null;
    }

    const rootCause = getRootCause(this.attributes.error)?.reason;
    const topLevelCause = this.attributes.error.reason;
    const cause = rootCause ?? topLevelCause;

    return (
      <>
        <EuiSpacer size="s" />
        <EuiCodeBlock data-test-subj="errMessage" isCopyable={true} paddingSize="s">
          {cause}
        </EuiCodeBlock>
      </>
    );
  }

  public getActions(application: ApplicationStart) {
    return [
      <EuiButton key="viewRequestDetails" color="primary" onClick={this.openInInspector} size="s">
        {i18n.translate('searchErrors.esError.viewDetailsButtonLabel', {
          defaultMessage: 'View details',
        })}
      </EuiButton>,
    ];
  }
}
