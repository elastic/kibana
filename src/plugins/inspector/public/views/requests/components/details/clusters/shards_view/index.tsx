/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ShardFailureFlyout } from './shard_failure_flyout';

interface Props {
  failures: ShardFailure[];
  shardsDetails?: ShardStatistics;
}

export function ShardsView({ failures, shardsDetails }: Props) {
  const [showFailures, setShowFailures] = useState(false);

  return !shardsDetails || failures.length === 0 ? null : (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h4>
              {i18n.translate('inspector.requests.shards.shardsTitle', {
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

      {shardsDetails ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {i18n.translate('inspector.requests.clusters.shards.totalShardsLabel', {
              defaultMessage: '{total} total shards',
              values: { total: shardsDetails.total },
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('inspector.requests.clusters.shards.successfulShardsLabel', {
              defaultMessage: '{successful} of {total} successful',
              values: {
                successful: shardsDetails.successful,
                total: shardsDetails.total,
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
