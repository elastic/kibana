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
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { ShardsView } from './shards_view';
import { OpenShardFailureFlyoutButton } from './shards_view';

interface Props {
  clusterDetails: estypes.ClusterDetails;
}

export function ClusterView({ clusterDetails }: Props) {
  const clusterFailure = (clusterDetails.failures ?? []).find((failure) => {
    return typeof failure.shard !== 'undefined' && failure.shard < 0;
  });
  const shardFailures = (clusterDetails.failures ?? []).filter((failure) => {
    return typeof failure.shard !== 'undefined' && failure.shard >= 0;
  });

  return (
    <EuiText css={{ width: '100%' }} size="xs" data-test-subj="inspectorRequestClustersDetails">
      {clusterDetails.timed_out ? (
        <EuiCallOut
          announceOnMount
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
          announceOnMount
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
