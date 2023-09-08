/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  clusterDetails: ClusterDetails;
}

export function ShardsDetails({ clusterDetails }: Props) {
  return (
    <>
      {clusterDetails._shards ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {i18n.translate('inspector.requests.shardsDetails.totalShardsLabel', {
              defaultMessage: '{total} total shards',
              values: { total: clusterDetails._shards.total },
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('inspector.requests.shardsDetails.successfulShardsLabel', {
              defaultMessage: '{successful} of {total} successful',
              values: {
                // _shards.skipped is count of shards excluded via search optimization.
                // Add skipped to successful count to avoid missing shards in message
                successful: clusterDetails._shards.successful + clusterDetails._shards.skipped,
                total: clusterDetails._shards.total,
              },
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
}
