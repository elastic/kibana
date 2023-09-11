/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ClusterHealth } from './cluster_health';
import { getHeathBarLinearGradient } from './utils';

interface Props {
  clusters: Record<string, ClusterDetails>;
}

export function ClustersHealth({ clusters }: Props) {
  let successful = 0;
  let partial = 0;
  let skipped = 0;
  let failed = 0;
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
            {i18n.translate('inspector.requests.shardsDetails.totalClustersLabel', {
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
        style={{
          background: getHeathBarLinearGradient(successful, partial, skipped, failed),
          borderRadius: '8px',
          height: '8px',
          marginTop: '4px',
        }}
      />
    </>
  );
}
