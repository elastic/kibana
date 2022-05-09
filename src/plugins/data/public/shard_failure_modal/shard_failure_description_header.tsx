/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCode, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ShardFailure } from './shard_failure_types';

export function getFailurePropsForSummary(
  failure: ShardFailure
): Array<{ key: string; value: string }> {
  const failureDetailProps: Array<keyof ShardFailure> = ['shard', 'index', 'node'];
  return failureDetailProps
    .filter((key) => typeof failure[key] === 'number' || typeof failure[key] === 'string')
    .map((key) => ({ key, value: String(failure[key]) }));
}

export function getFailureSummaryText(failure: ShardFailure, failureDetails?: string): string {
  const failureName = failure.reason.type;
  const displayDetails =
    typeof failureDetails === 'string' ? failureDetails : getFailureSummaryDetailsText(failure);

  return i18n.translate('data.search.searchSource.fetch.shardsFailedModal.failureHeader', {
    defaultMessage: '{failureName} at {failureDetails}',
    values: { failureName, failureDetails: displayDetails },
    description: 'Summary of shard failures, e.g. "IllegalArgumentException at shard 0 node xyz"',
  });
}

export function getFailureSummaryDetailsText(failure: ShardFailure): string {
  return getFailurePropsForSummary(failure)
    .map(({ key, value }) => `${key}: ${value}`)
    .join(', ');
}

export function ShardFailureDescriptionHeader(props: ShardFailure) {
  const failureDetails = getFailurePropsForSummary(props).map((kv) => (
    <span className="shardFailureModal__keyValueTitle" key={kv.key}>
      <EuiCode>{kv.key}</EuiCode> {kv.value}
    </span>
  ));
  return (
    <EuiTitle size="xs">
      <h2>
        {getFailureSummaryText(props, '')}
        {failureDetails}
      </h2>
    </EuiTitle>
  );
}
