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
import { EuiButtonEmpty } from '@elastic/eui';
import { ShardFailureFlyout } from './shard_failure_flyout';

interface Props {
  failures: estypes.ShardFailure[];
}

export function OpenShardFailureFlyoutButton({ failures }: Props) {
  const [showFailures, setShowFailures] = useState(false);

  return (
    <>
      {failures.length ? (
        <EuiButtonEmpty
          flush="both"
          onClick={() => {
            setShowFailures(!showFailures);
          }}
          size="xs"
        >
          {i18n.translate('inspector.requests.clusters.shards.openShardFailureFlyoutButtonLabel', {
            defaultMessage:
              'View {failedShardCount} failed {failedShardCount, plural, one {shard} other {shards}}',
            values: { failedShardCount: failures.length },
          })}
        </EuiButtonEmpty>
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
