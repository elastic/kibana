/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { ShardsOverview } from './shards_overview';

interface Props {
  clusterDetails: ClusterDetails;
}

export function ClusterView({ clusterDetails }: Props) {
  return (
    <EuiText style={{ width: '100%' }} size="xs">
      {clusterDetails.timed_out ? (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate('inspector.requests.clusterDetails.timedOutDescription', {
            defaultMessage:
              'Request timed out before completion. Results may be incomplete or empty.',
          })}
          iconType="warning"
        />
      ) : null}

      <ShardsOverview
        failures={clusterDetails.failures ?? []}
        shardsDetails={clusterDetails._shards}
      />
    </EuiText>
  );
}
