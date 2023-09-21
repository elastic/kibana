/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ShardFailureFlyout } from './shard_failure_flyout';

interface Props {
  failures: estypes.ShardFailure[];
  shardStats?: estypes.ShardStatistics;
}

export function ShardsView({ failures, shardStats }: Props) {
  const [showFailures, setShowFailures] = useState(false);

  return !shardStats && failures.length === 0 ? null : (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h4>
              {i18n.translate('inspector.requests.clusters.shards.shardsTitle', {
                defaultMessage: 'Shards',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>

        {failures.length ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={() => {
                setShowFailures(!showFailures);
              }}
              size="xs"
            >
              {i18n.translate('inspector.requests.clusters.shards.hideFailuresLabel', {
                defaultMessage:
                  'View {failedShardCount} failed {failedShardCount, plural, one {shard} other {shards}}',
                values: { failedShardCount: failures.length },
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      {shardStats ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {i18n.translate('inspector.requests.clusters.shards.totalShardsLabel', {
              defaultMessage: '{total} total shards',
              values: { total: shardStats.total },
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('inspector.requests.clusters.shards.successfulShardsLabel', {
              defaultMessage: '{successful} of {total} successful',
              values: {
                successful: shardStats.successful,
                total: shardStats.total,
              },
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {showFailures ? (
        <ShardFailureFlyout
          failures={failures}
          onClose={() => {
            setShowFailures(false);
          }}
        />
      ) : null}
    </>
  );
}
