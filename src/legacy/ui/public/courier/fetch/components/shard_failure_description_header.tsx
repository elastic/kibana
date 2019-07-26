import React from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ShardFailure } from './shard_failure_types';
import { formatKey } from './shard_failure_description';


export function getFailurePropsForSummary(
  failure: ShardFailure
): Array<{ key: string; value: string }> {
  const failureDetailProps: Array<keyof ShardFailure> = ['shard', 'index', 'node'];
  return failureDetailProps
    .filter(key => typeof failure[key] === 'number' || typeof failure[key] === 'string')
    .map(key => ({ key, value: String(failure[key]) }));
}

export function getFailureSummaryText(failure: ShardFailure, failureDetails?: string): string {
  const failureName = formatKey(failure.reason.type);
  const displayDetails =
    typeof failureDetails === 'string' ? failureDetails : getFailureSummaryDetailsText(failure);

  return i18n.translate('common.ui.courier.fetch.shardsFailedModal.failureHeader', {
    defaultMessage: '{failureName} at {failureDetails}',
    values: { failureName, failureDetails: displayDetails },
    description: 'Summary of a shard failure',
  });
}

export function getFailureSummaryDetailsText(failure: ShardFailure): string {
  return getFailurePropsForSummary(failure)
    .map(kv => `${kv.key}: ${kv.value}`)
    .join(', ');
}

export function ShardFailureDescriptionHeader(props: ShardFailure) {
  const failureDetails = getFailurePropsForSummary(props).map(kv => (
    <span className="shardFailureModal__keyValueTitle">
      <EuiCode>{kv.key}</EuiCode> {kv.value}
    </span>
  ));
  return (
    <h2>
      {getFailureSummaryText(props, '')}
      {failureDetails}
    </h2>
  );
}
