/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
