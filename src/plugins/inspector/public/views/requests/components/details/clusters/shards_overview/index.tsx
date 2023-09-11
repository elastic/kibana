/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Failures } from './failures';

interface Props {
  failures: ShardFailure[];
  shardsDetails: ShardStatistics;
}

export function ShardsOverview({ failures, shardsDetails }: Props) {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {i18n.translate('inspector.requests.shardsDetails.totalShardsLabel', {
            defaultMessage: '{total} total shards',
            values: { total: shardsDetails.total },
          })}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {i18n.translate('inspector.requests.shardsDetails.successfulShardsLabel', {
            defaultMessage: '{successful} of {total} successful',
            values: {
              // _shards.skipped is count of shards excluded via search optimization.
              // Add skipped to successful count to avoid missing shards in message
              successful: shardsDetails.successful + shardsDetails.skipped,
              total: shardsDetails.total,
            },
          })}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      <Failures failures={failures} />
    </>
  );
}
