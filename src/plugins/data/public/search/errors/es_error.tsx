/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KbnError } from '@kbn/kibana-utils-plugin/common';
import { IEsError } from './types';
import { getRootCause } from './utils';

export class EsError extends KbnError {
  readonly attributes: IEsError['attributes'];

  constructor(protected readonly err: IEsError) {
    super(
      `EsError: ${
        getRootCause(err)?.reason ||
        i18n.translate('data.esError.unknownRootCause', { defaultMessage: 'unknown' })
      }`
    );
    this.attributes = err.attributes;
  }

  public getErrorMessage(application: ApplicationStart) {
    const rootCause = getRootCause(this.err)?.reason;
    const topLevelCause = this.attributes?.reason;
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
