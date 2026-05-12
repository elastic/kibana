/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';

/** Max stored characters for payload JSON string (cell also clips via maxHeight). */
const PAYLOAD_SUMMARY_MAX_CHARS = 4000;

export interface TriggerEventLogGridRow {
  id: string;
  timestampDisplay: string;
  triggerId: string;
  eventId: string;
  /** Payload-only preview for the payload column (not full document JSON). */
  payloadSummaryText: string;
  /** True when the document has no payload keys to show. */
  payloadSummaryEmpty: boolean;
  /** Subscription workflow IDs (one badge per id in the Summary column). */
  subscriptionIds: string[];
}

export function triggerSourceToGridRow(
  id: string,
  source: Record<string, unknown>
): TriggerEventLogGridRow {
  const ts = source['@timestamp'];
  const timestampDisplay =
    typeof ts === 'string' ? new Date(ts).toLocaleString() : String(ts ?? '—');
  const triggerId = String(source.triggerId ?? '—');
  const eventId = String(source.eventId ?? '—');

  const subscriptionIds = Array.isArray(source.subscriptions)
    ? source.subscriptions.map((s) => String(s))
    : [];

  const { text: payloadSummaryText, isEmpty: payloadSummaryEmpty } = buildPayloadSummaryText(
    source.payload
  );

  return {
    id,
    timestampDisplay,
    triggerId,
    eventId,
    payloadSummaryText,
    payloadSummaryEmpty,
    subscriptionIds,
  };
}

function buildPayloadSummaryText(payload: unknown): { text: string; isEmpty: boolean } {
  if (payload === undefined || payload === null) {
    return { text: '', isEmpty: true };
  }
  if (typeof payload === 'object' && !Array.isArray(payload) && Object.keys(payload).length === 0) {
    return { text: '', isEmpty: true };
  }
  const json = JSON.stringify(payload);
  const text =
    json.length > PAYLOAD_SUMMARY_MAX_CHARS ? `${json.slice(0, PAYLOAD_SUMMARY_MAX_CHARS)}…` : json;
  return { text, isEmpty: false };
}

const emptyPayloadSummaryLabel = i18n.translate(
  'workflows.workflowExecuteEventTriggerForm.payloadSummaryEmpty',
  {
    defaultMessage: 'Empty payload',
  }
);

function truncateForBadge(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  const half = Math.floor((max - 1) / 2);
  return `${value.slice(0, half)}…${value.slice(value.length - half)}`;
}

/** Trigger + subscription badges and compact event payload JSON (Summary column). */
export const TriggerEventLogSummaryCell = ({
  row,
}: {
  row: TriggerEventLogGridRow;
}): React.JSX.Element => {
  const hasTrigger = row.triggerId !== '—';
  const hasSubs = row.subscriptionIds.length > 0;
  const hasBadges = hasTrigger || hasSubs;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="stretch" responsive={false}>
      {hasBadges ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" wrap alignItems="center" responsive={false}>
            {hasTrigger ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" title={row.triggerId}>
                  {truncateForBadge(row.triggerId, 36)}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {row.subscriptionIds.map((id) => (
              <EuiFlexItem grow={false} key={`${row.id}-sub-${id}`}>
                <EuiBadge color="hollow" title={id}>
                  {truncateForBadge(id, 32)}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <TriggerEventLogPayloadCell row={row} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** Payload JSON text only (metadata lives in grid columns). */
export const TriggerEventLogPayloadCell = ({
  row,
}: {
  row: TriggerEventLogGridRow;
}): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();

  if (row.payloadSummaryEmpty) {
    return (
      <EuiText size="xs" color="subdued">
        {emptyPayloadSummaryLabel}
      </EuiText>
    );
  }

  return (
    <EuiText
      size="xs"
      css={css({
        fontFamily: euiTheme.font.familyCode,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxHeight: `calc(${euiTheme.size.xl} * 6)`,
        overflow: 'hidden',
      })}
    >
      {row.payloadSummaryText}
    </EuiText>
  );
};
