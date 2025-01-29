/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { ClusterHealth } from './cluster_health';
import { useHeathBarLinearGradient } from './gradient';

interface Props {
  clusters: Record<string, estypes.ClusterDetails>;
}

export function ClustersHealth({ clusters }: Props) {
  let successful = 0;
  let partial = 0;
  let skipped = 0;
  let failed = 0;
  const { euiTheme } = useEuiTheme();

  Object.values(clusters).forEach((clusterDetails) => {
    if (clusterDetails.status === 'successful') {
      successful++;
    } else if (clusterDetails.status === 'partial') {
      partial++;
    } else if (clusterDetails.status === 'skipped') {
      skipped++;
    } else if (clusterDetails.status === 'failed') {
      failed++;
    }
  });

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('inspector.requests.clusters.totalClustersLabel', {
              defaultMessage: '{total} {total, plural, one {cluster} other {clusters}}',
              values: { total: Object.keys(clusters).length },
            })}
          </EuiText>
        </EuiFlexItem>

        {successful > 0 ? (
          <EuiFlexItem grow={false}>
            <ClusterHealth count={successful} status="successful" />
          </EuiFlexItem>
        ) : null}

        {partial > 0 ? (
          <EuiFlexItem grow={false}>
            <ClusterHealth count={partial} status="partial" />
          </EuiFlexItem>
        ) : null}

        {skipped > 0 ? (
          <EuiFlexItem grow={false}>
            <ClusterHealth count={skipped} status="skipped" />
          </EuiFlexItem>
        ) : null}

        {failed > 0 ? (
          <EuiFlexItem grow={false}>
            <ClusterHealth count={failed} status="failed" />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      <div
        css={css`
          background: ${useHeathBarLinearGradient(successful, partial, skipped, failed)};
          border-radius: ${euiTheme.border.radius.small};
          height: ${euiTheme.size.s};
          margin-top: ${euiTheme.size.xs};
          margin-bottom: ${euiTheme.size.s};
        `}
      />
    </>
  );
}
