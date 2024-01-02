/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCodeBlock } from '@elastic/eui';
import type { IEsError } from './types';

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
  public readonly attributes: IEsError['attributes'];
  private readonly openInInspector: () => void;

  constructor(err: IEsError, message: string, openInInspector: () => void) {
    super(message);
    this.attributes = err.attributes;
    this.openInInspector = openInInspector;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public getErrorMessage() {
    return (
      <EuiCodeBlock data-test-subj="errMessage" isCopyable={true} paddingSize="s">
        {this.message}
      </EuiCodeBlock>
    );
  }

  public getActions() {
    return [
      <EuiButton
        data-test-subj="viewEsErrorButton"
        key="viewRequestDetails"
        color="primary"
        onClick={this.openInInspector}
        size="s"
      >
        {i18n.translate('searchErrors.esError.viewDetailsButtonLabel', {
          defaultMessage: 'View details',
        })}
      </EuiButton>,
    ];
  }
}
