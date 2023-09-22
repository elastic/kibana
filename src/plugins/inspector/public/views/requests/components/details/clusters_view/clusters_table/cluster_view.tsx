/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { ClusterDetails } from '@kbn/es-types';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { ShardsView } from './shards_view';

export function getFailures(clusterDetails: ClusterDetails) {
  const clusterFailures: estypes.ShardFailure[] = [];
  const shardFailures: estypes.ShardFailure[] = [];
  (clusterDetails.failures ?? []).forEach((failure) => {
    if (failure.shard < 0) {
      clusterFailures.push(failure);
      (failure?.reason?.failed_shards ?? []).forEach((reasonFailure: estypes.ShardFailure) => {
        shardFailures.push(reasonFailure);
      });
    } else {
      shardFailures.push(failure);
    }
  });

  return {
    clusterFailures,
    shardFailures,
  };
}

function printErrorCause(errorCause: ErrorCause) {
  return errorCause.reason ? `${errorCause.type}: "${errorCause.reason}"` : errorCause.type;
}

interface Props {
  clusterDetails: ClusterDetails;
}

export function ClusterView({ clusterDetails }: Props) {
  const { clusterFailures, shardFailures } = getFailures(clusterDetails);
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

      {clusterDetails.status === 'skipped' ? (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate('inspector.requests.clusters.skippedClusterMessage', {
            defaultMessage: 'Search failed',
          })}
          iconType="warning"
        >
          {clusterFailures[0]?.reason ? printErrorCause(clusterFailures[0]?.reason) : ''}
        </EuiCallOut>
      ) : null}

      <ShardsView failures={shardFailures} shardStats={clusterDetails._shards} />
    </EuiText>
  );
}
