/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList, EuiDescriptionListProps, EuiText } from '@elastic/eui';
import { ShardsOverview } from './shards_overview';

interface Props {
  clusterDetails: ClusterDetails;
}

export function ClusterDescriptionList({ clusterDetails }: Props) {
  const items: EuiDescriptionListProps['listItems'] = [];
  if (clusterDetails.timed_out) {
    items.push({
      title: i18n.translate('inspector.requests.clusterDetails.timedOutTitle', {
        defaultMessage: 'Timed out',
      }),
      description: (
        <EuiText size="xs" color="subdued">
          {i18n.translate('inspector.requests.clusterDetails.timedOutDescription', {
            defaultMessage:
              'Request timed out before completion. Results may be incomplete or empty.',
          })}
        </EuiText>
      ),
    });
  }

  if (clusterDetails._shards) {
    items.push({
      title: i18n.translate('inspector.requests.clusterDetails.shardsTitle', {
        defaultMessage: 'Shards',
      }),
      description: (
        <EuiText size="xs" color="subdued">
          <ShardsOverview
            failures={clusterDetails.failures ?? []}
            shardsDetails={clusterDetails._shards}
          />
        </EuiText>
      ),
    });
  }

  return (
    <EuiText style={{ width: '100%' }} size="xs">
      <EuiDescriptionList style={{ width: '100%' }} listItems={items} compressed={true} />
    </EuiText>
  );
}
