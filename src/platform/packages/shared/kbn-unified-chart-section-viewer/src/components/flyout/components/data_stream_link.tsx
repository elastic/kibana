/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';

interface DataStreamLinkProps {
  dataStream?: string;
  getStreamUrl: (name: string) => string | undefined;
}

/**
 * Presentational component that renders a data stream name as a navigable link
 * or plain text. URL resolution and permission gating are delegated to the
 * `getStreamUrl` callback provided by the consumer.
 */
export const DataStreamLink = ({ dataStream, getStreamUrl }: DataStreamLinkProps) => {
  if (!dataStream) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="metricsDataStreamEmpty">
        -
      </EuiText>
    );
  }

  const streamUrl = getStreamUrl(dataStream);

  if (!streamUrl) {
    return (
      <EuiText size="s" data-test-subj="metricsDataStreamText">
        {dataStream}
      </EuiText>
    );
  }

  return (
    <EuiLink href={streamUrl} data-test-subj="metricsDataStreamLink">
      <EuiText size="s">{dataStream}</EuiText>
    </EuiLink>
  );
};
