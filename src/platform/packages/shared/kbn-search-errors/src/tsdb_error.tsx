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
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';
import type { IEsError } from './types';
import { EsError } from './es_error';

export class TsdbError extends EsError {
  private readonly docLinks: CoreStart['docLinks'];

  constructor(
    err: IEsError,
    openInInspector: () => void,
    tsdbCause: estypes.ErrorCause,
    docLinks: CoreStart['docLinks']
  ) {
    const [fieldName, _type, _isCounter, opUsed] = tsdbCause.reason!.match(/\[(\w)*\]/g)!;
    super(
      err,
      i18n.translate('searchErrors.tsdbError.message', {
        defaultMessage:
          'The field {field} of Time series type [counter] has been used with the unsupported operation {op}.',
        values: {
          field: fieldName,
          op: opUsed,
        },
      }),
      openInInspector
    );
    this.docLinks = docLinks;
  }

  public getErrorMessage() {
    return (
      <div>
        <p className="eui-textBreakWord">{this.message}</p>
        <EuiLink href={this.docLinks.links.fleet.datastreamsTSDSMetrics} external target="_blank">
          {i18n.translate('searchErrors.tsdbError.tsdbCounterDocsLabel', {
            defaultMessage:
              'See more about Time series field types and [counter] supported aggregations',
          })}
        </EuiLink>
      </div>
    );
  }
}
