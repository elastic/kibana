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
import { ShardsDetails } from './shards_details';

interface Props {
  clusterDetails: ClusterDetails;
}

export function ClusterDescriptionList({ clusterDetails }: Props) {
  const items: EuiDescriptionListProps['listItems'] = [];
  if (clusterDetails._shards) {
    items.push({
      title: i18n.translate('inspector.requests.clusterDetails.shardsLabel', {
        defaultMessage: 'Shards',
      }),
      description: (
        <EuiText size="xs" color="subdued">
          <ShardsDetails failures={clusterDetails.failures ?? []} shardsDetails={clusterDetails._shards} />
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
