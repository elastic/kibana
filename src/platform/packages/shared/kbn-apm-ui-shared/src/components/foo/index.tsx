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

interface FooProps {
  callApmApi: (endpoint: 'GET /internal/apm/foo', options?: any) => Promise<{ msg: string }>;
}

export function Foo({ callApmApi }: FooProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ msg: string } | null>(null);

  const handleClick = async () => {
    if (data) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const response = await callApmApi('GET /internal/apm/foo', {});
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
