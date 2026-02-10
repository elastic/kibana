/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram/types';

interface DataStreamLinkProps {
  dataStream?: string | string[];
  services: UnifiedHistogramServices;
}

/**
 * Renders navigable links to the Streams app for one or more data streams.
 * Displays plain text when the user lacks permissions, or "-" for invalid/empty values.
 */
export const DataStreamLink = ({ dataStream, services }: DataStreamLinkProps) => {
  const streamsFeature = services.discoverShared?.features.registry.getById('streams');
  const hasStreamPermissions = Boolean(streamsFeature);

  const streamsLocator = useMemo(() => {
    return services.share?.url.locators.get(STREAMS_APP_LOCATOR_ID);
  }, [services.share]);

  const dataStreams = Array.isArray(dataStream) ? dataStream : dataStream ? [dataStream] : [];
  const validDataStreams = dataStreams.filter((ds) => ds && !ds.includes('*'));

  if (validDataStreams.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="metricsDataStreamEmpty">
        -
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj="metricsDataStreamList">
      {validDataStreams.map((ds) => {
        const streamUrl = streamsLocator?.getRedirectUrl({ name: ds });

        return (
          <EuiFlexItem key={ds} grow={false}>
            {hasStreamPermissions && streamUrl ? (
              <EuiLink href={streamUrl} data-test-subj="metricsDataStreamLink">
                <EuiText size="s">{ds}</EuiText>
              </EuiLink>
            ) : (
              <EuiText size="s" data-test-subj="metricsDataStreamText">
                {ds}
              </EuiText>
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
