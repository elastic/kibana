/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type {
  AttentionReason,
  EnvironmentHealthResponse,
} from '../../../../common/environment_health';
import type { EnvironmentHealthLoadState } from './use_management_environment_health';

export function dash(v: number | undefined): string {
  return v === undefined ? '—' : v.toLocaleString();
}

export function ManagementLandingHealthBadge({ status }: { status?: 'green' | 'yellow' | 'red' }) {
  if (!status) {
    return (
      <EuiBadge color="hollow" data-test-subj="managementEnvHealthClusterStatus">
        —
      </EuiBadge>
    );
  }
  const color = status === 'green' ? 'success' : status === 'yellow' ? 'warning' : 'danger';
  return (
    <EuiBadge color={color} data-test-subj="managementEnvHealthClusterStatus">
      {status}
    </EuiBadge>
  );
}

/** Stats (indices, data streams, placeholders) in a single horizontal row. */
function ManagementLandingStatsDescription({ data }: { data: EnvironmentHealthResponse }) {
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="managementEnvHealthIndices">
          <strong>{dash(data.indicesCount)}</strong>{' '}
          <FormattedMessage
            id="management.landing.envHealth.indices"
            defaultMessage="{count, plural, one {index} other {indices}}"
            values={{ count: data.indicesCount ?? 0 }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="managementEnvHealthDataStreams">
          <strong>{dash(data.dataStreamsCount)}</strong>{' '}
          <FormattedMessage
            id="management.landing.envHealth.dataStreams"
            defaultMessage="{count, plural, one {data stream} other {data streams}}"
            values={{ count: data.dataStreamsCount ?? 0 }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="managementEnvHealthActiveRules">
          <strong>{dash(data.activeRulesCount)}</strong>{' '}
          <FormattedMessage
            id="management.landing.envHealth.activeRules"
            defaultMessage="{count, plural, one {active rule} other {active rules}}"
            values={{ count: data.activeRulesCount ?? 0 }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" data-test-subj="managementEnvHealthPendingReports">
          —{' '}
          <FormattedMessage
            id="management.landing.envHealth.pendingReports"
            defaultMessage="pending reports (soon)"
          />
        </EuiText>
      </EuiFlexItem>
    </>
  );
}

export function ManagementLandingHeaderDescription({
  loadState,
  data,
}: {
  loadState: EnvironmentHealthLoadState;
  data: EnvironmentHealthResponse | null;
}) {
  if (loadState === 'loading' || (loadState === 'ready' && !data)) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="managementLandingHeaderStatsLoading">
        <FormattedMessage
          id="management.landing.headerStatsLoading"
          defaultMessage="Loading environment details…"
        />
      </EuiText>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      wrap
      responsive={false}
      gutterSize="l"
      css={css`
        max-width: 100%;
      `}
    >
      <ManagementLandingStatsDescription data={data} />
    </EuiFlexGroup>
  );
}

const ATTENTION_REASON_LABELS: Record<AttentionReason, string> = {
  cluster_red: i18n.translate('management.landing.envHealth.attention.clusterRed', {
    defaultMessage: 'Cluster health is red',
  }),
  cluster_yellow: i18n.translate('management.landing.envHealth.attention.clusterYellow', {
    defaultMessage: 'Cluster health is yellow',
  }),
  unassigned_shards: i18n.translate('management.landing.envHealth.attention.unassignedShards', {
    defaultMessage: 'There are unassigned shards',
  }),
  health_check_timed_out: i18n.translate('management.landing.envHealth.attention.timedOut', {
    defaultMessage: 'Health check timed out',
  }),
};

export function ManagementAttentionCallout({ reasons }: { reasons: AttentionReason[] }) {
  if (reasons.length === 0) {
    return null;
  }

  const mostSevere = reasons.includes('cluster_red') ? 'danger' : 'warning';

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="management.landing.envHealth.attention.title"
          defaultMessage="Attention needed"
        />
      }
      color={mostSevere}
      iconType="alert"
      data-test-subj="managementEnvHealthAttentionCallout"
    >
      {reasons.length === 1 ? (
        <p>{ATTENTION_REASON_LABELS[reasons[0]]}</p>
      ) : (
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{ATTENTION_REASON_LABELS[reason]}</li>
          ))}
        </ul>
      )}
    </EuiCallOut>
  );
}
