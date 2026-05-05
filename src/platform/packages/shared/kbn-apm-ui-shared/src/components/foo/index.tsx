/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButton, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { APMClientV2, APIReturnType } from '@kbn/apm-api-shared';

type FooReturnType = APIReturnType<'GET /internal/apm/foo/{serviceName}'>;

interface FooProps {
  callApmApi: APMClientV2;
}

export function Foo({ callApmApi }: FooProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FooReturnType | null>(null);

  const handleClick = async () => {
    if (data) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const response = await callApmApi('GET /internal/apm/foo/{serviceName}', {
        params: { path: { serviceName: 'my-service' }, query: { foo: 'bar' } },
        signal: null,
      });

      setData(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <EuiButton data-test-subj="apmFooButton" onClick={handleClick}>
        {data ? 'Reset' : 'Fetch Foo'}
      </EuiButton>
      {loading && <EuiLoadingSpinner size="m" />}
      {data && (
        <EuiText>
          <p>{data.msg}</p>
        </EuiText>
      )}
    </>
  );
}
