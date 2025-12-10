/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { useDataSourcesContext } from '../hooks/use_data_sources';
import { useGetGenerateDiscoverLink } from '../hooks/use_get_generate_discover_link';

interface TraceIdLinkProps {
  traceId: string;
  formattedTraceId: React.ReactNode;
  'data-test-subj': string;
}

export function TraceIdLink({
  traceId,
  formattedTraceId,
  'data-test-subj': dataTestSubj,
}: TraceIdLinkProps) {
  const { indexes } = useDataSourcesContext();
  const tracesIndexPattern = indexes?.apm?.traces;
  const { generateDiscoverLink } = useGetGenerateDiscoverLink({
    indexPattern: tracesIndexPattern,
  });

  const discoverUrl = useMemo(() => {
    if (!tracesIndexPattern) {
      return undefined;
    }
    return generateDiscoverLink({ 'trace.id': traceId });
  }, [generateDiscoverLink, traceId, tracesIndexPattern]);

  return (
    <>
      {discoverUrl ? (
        <EuiLink
          href={discoverUrl}
          data-test-subj={dataTestSubj}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formattedTraceId}
        </EuiLink>
      ) : (
        <EuiText size="xs">{traceId}</EuiText>
      )}
    </>
  );
}
