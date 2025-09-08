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
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ShardFailureTable } from './shard_failure_table';

interface Props {
  failures: estypes.ShardFailure[];
  onClose: () => void;
}

export function ShardFailureFlyout({ failures, onClose }: Props) {
  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      onClose={onClose}
      ownFocus={false}
      hideCloseButton={true}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h1 id={flyoutTitleId}>
            <EuiButtonIcon iconType="sortLeft" onClick={onClose} />
            {i18n.translate('inspector.requests.clusters.shards.flyoutTitle', {
              defaultMessage:
                '{failedShardCount} failed {failedShardCount, plural, one {shard} other {shards}}',
              values: { failedShardCount: failures.length },
            })}
          </h1>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <ShardFailureTable failures={failures} />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty iconType="sortLeft" onClick={onClose} flush="left">
          {i18n.translate('inspector.requests.clusters.shards.backButtonLabel', {
            defaultMessage: 'Back',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
