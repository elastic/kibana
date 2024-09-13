/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart, CoreStart } from '@kbn/core/public';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import { IEsError } from './types';
import { EsError } from './es_error';
import { PainlessError } from './painless_error';
import { TsdbError } from './tsdb_error';

export interface Services {
  application: ApplicationStart;
  docLinks: CoreStart['docLinks'];
}

function getNestedCauses(errorCause: estypes.ErrorCause): estypes.ErrorCause[] {
  // Give shard failures priority, then try to get the error navigating nested objects
  if (errorCause.failed_shards) {
    return (errorCause.failed_shards as estypes.ShardFailure[]).map(
      (shardFailure) => shardFailure.reason
    );
  }
  return errorCause.caused_by ? getNestedCauses(errorCause.caused_by) : [errorCause];
}

export function createEsError(
  err: IEsError,
  openInInspector: () => void,
  services: Services,
  dataView?: AbstractDataView
) {
  const rootCauses = err.attributes?.error ? getNestedCauses(err.attributes?.error) : [];

  const painlessCause = rootCauses.find((errorCause) => {
    return errorCause.lang && errorCause.lang === 'painless';
  });
  if (painlessCause) {
    return new PainlessError(err, openInInspector, painlessCause, services.application, dataView);
  }

  const tsdbCause = rootCauses.find((errorCause) => {
    return (
      errorCause.type === 'illegal_argument_exception' &&
      errorCause.reason &&
      /\]\[counter\] is not supported for aggregation/.test(errorCause.reason)
    );
  });
  if (tsdbCause) {
    return new TsdbError(err, openInInspector, tsdbCause, services.docLinks);
  }

  const causeReason = rootCauses[0]?.reason ?? err.attributes?.error?.reason;
  const message = causeReason
    ? causeReason
    : i18n.translate('searchErrors.esError.unknownRootCause', { defaultMessage: 'unknown' });
  return new EsError(err, message, openInInspector);
}
