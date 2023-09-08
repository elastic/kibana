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

interface Props {
  clusters: Record<string, ClusterDetails>;
}

export function ClustersHealth({ clusters }: Props) {
  let successfulCount = 0;
  let partialCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  Object.values(clusters).forEach(clusterDetails => {
    if (clusterDetails.status === 'successful') {
      successfulCount++;
    } else if (clusterDetails.status === 'partial') {
      partialCount++
    } else if (clusterDetails.status === 'skipped') {
      skippedCount++;
    } else if (clusterDetails.status === 'failed') {
      failedCount++;
    }
  });

  function renderStatus(count: number, color: string) {

  }
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('inspector.requests.shardsDetails.totalClustersLabel', {
            defaultMessage: '{total} {total, plural, one {cluster} other {clusters}}',
            values: { total: Object.keys(clusters).length },
          })}
        </EuiText>
      </EuiFlexItem>

      {successfulCount > 0 ? <EuiFlexItem grow={false}><ClusterHealth count={successfulCount} status="successful" /></EuiFlexItem> : null}

      {partialCount > 0 ? <EuiFlexItem grow={false}><ClusterHealth count={partialCount} status="partial" /></EuiFlexItem> : null}

      {skippedCount > 0 ? <EuiFlexItem grow={false}><ClusterHealth count={skippedCount} status="skipped" /></EuiFlexItem> : null}

      {failedCount > 0 ? <EuiFlexItem grow={false}><ClusterHealth count={failedCount} status="failed" /></EuiFlexItem> : null}
      
    </EuiFlexGroup>
  )
}