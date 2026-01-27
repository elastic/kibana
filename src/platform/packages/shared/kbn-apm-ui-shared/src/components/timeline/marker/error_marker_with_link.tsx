/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ErrorMarker } from './error_marker';
// import { TRACE_ID, TRANSACTION_ID } from '../../../../../../common/es_fields/apm';
// import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import type { ErrorMark } from '../../../types/mark';

export function ErrorMarkerWithLink({ mark }: { mark: ErrorMark }) {
  // TODO:caue
  // const { query } = useAnyOfApmParams(
  //   '/services/{serviceName}/overview',
  //   '/services/{serviceName}/errors',
  //   '/services/{serviceName}/transactions/view',
  //   '/mobile-services/{serviceName}/overview',
  //   '/mobile-services/{serviceName}/transactions/view',
  //   '/mobile-services/{serviceName}/errors-and-crashes',
  //   '/traces/explorer/waterfall',
  //   '/dependencies/operation'
  // );
  const query = {};

  const serviceGroup = 'serviceGroup' in query ? query.serviceGroup : '';

  const traceId = mark.error.trace?.id;
  const transactionId = mark.error.transaction?.id;

  const kueryParts = [
    traceId && `${'trace.id'} : "${traceId}"`,
    transactionId && `${'transaction.id'} : "${transactionId}"`,
  ].filter(Boolean);

  const queryParam = {
    ...query,
    serviceGroup,
    kuery: kueryParts.join(' and '),
  };

  return <ErrorMarker mark={mark} query={queryParam} />;
}
