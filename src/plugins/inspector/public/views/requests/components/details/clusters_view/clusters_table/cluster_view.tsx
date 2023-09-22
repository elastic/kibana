/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ClusterDetails } from '@kbn/es-types';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { ShardsView } from './shards_view';
import { OpenShardFailureFlyoutButton } from './shards_view';

interface Props {
  clusterDetails: ClusterDetails;
}

export function ClusterView({ clusterDetails }: Props) {
  const clusterFailure = (clusterDetails.failures ?? []).find((failure) => {
    return failure.shard < 0;
  });
  const shardFailures = (clusterDetails.failures ?? []).filter((failure) => {
    return failure.shard >= 0;
  });

  return (
    <EuiText style={{ width: '100%' }} size="xs">
      {clusterDetails.timed_out ? (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate('inspector.requests.clusters.timedOutMessage', {
            defaultMessage:
              'Request timed out before completion. Results may be incomplete or empty.',
          })}
          iconType="warning"
        />
      ) : null}

      {clusterFailure ? (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate('inspector.requests.clusters.failedClusterMessage', {
            defaultMessage: 'Search failed',
          })}
          iconType="warning"
        >
          <p>
            {clusterFailure.reason.reason
              ? `${clusterFailure.reason.type}: "${clusterFailure.reason.reason}"`
              : clusterFailure.reason.type}
          </p>
          {clusterFailure.reason.failed_shards ? (
            <OpenShardFailureFlyoutButton failures={clusterFailure.reason.failed_shards} />
          ) : null}
        </EuiCallOut>
      ) : null}

      <ShardsView failures={shardFailures} shardStats={clusterDetails._shards} />
    </EuiText>
  );
}
