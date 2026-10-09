/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';

import { ShardFailureFlyout } from './shard_failure_flyout';

export function useShardFailureFlyout(failures: estypes.ShardFailure[]) {
  const [showFailures, setShowFailures] = useState(false);

  const triggerLabel = i18n.translate(
    'inspector.requests.clusters.shards.openShardFailureFlyoutButtonLabel',
    {
      defaultMessage:
        'View {failedShardCount} failed {failedShardCount, plural, one {shard} other {shards}}',
      values: { failedShardCount: failures.length },
    }
  );

  const openFlyout = () => setShowFailures(true);
  const closeFlyout = () => setShowFailures(false);
  const toggleFlyout = () => setShowFailures((prev) => !prev);

  const flyout = showFailures ? (
    <ShardFailureFlyout failures={failures} onClose={closeFlyout} />
  ) : null;

  return {
    triggerLabel,
    flyout,
    openFlyout,
    closeFlyout,
    toggleFlyout,
  };
}
