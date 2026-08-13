/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { EuiButtonEmpty } from '@elastic/eui';
import { useShardFailureFlyout } from './use_shard_failure_flyout';

interface Props {
  failures: estypes.ShardFailure[];
}

export function OpenShardFailureFlyoutButton({ failures }: Props) {
  const { triggerLabel, flyout, toggleFlyout } = useShardFailureFlyout(failures);

  return failures.length ? (
    <>
      <EuiButtonEmpty flush="both" onClick={toggleFlyout} size="xs">
        {triggerLabel}
      </EuiButtonEmpty>

      {flyout}
    </>
  ) : null;
}
