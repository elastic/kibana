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
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { OpenShardFailureFlyoutButton } from './open_shard_failure_flyout_button';

interface Props {
  failures: estypes.ShardFailure[];
  shardStats?: estypes.ShardStatistics;
}

export function ShardsView({ failures, shardStats }: Props) {
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

        <EuiFlexItem grow={false}>
          <OpenShardFailureFlyoutButton failures={failures} />
        </EuiFlexItem>
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
    </>
  );
}
