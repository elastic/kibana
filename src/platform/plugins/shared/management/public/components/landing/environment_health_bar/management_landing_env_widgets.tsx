/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import type { ApplicationStart } from '@kbn/core/public';
import type {
  AttentionReason,
  EnvironmentHealthResponse,
} from '../../../../common/environment_health';
import type { EnvironmentHealthLoadState } from './use_management_environment_health';

export function dash(v: number | undefined): string {
  return v === undefined ? '—' : v.toLocaleString();
}

/** Client fallback when `pendingReportsCount` is absent from the API (older responses). */
export const MANAGEMENT_LANDING_PENDING_REPORTS_FALLBACK_COUNT = 3;

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

/** Vertical divider between stat KPIs — matches dataset quality summary panel rhythm. */
function ManagementLandingStatsVerticalRule(props: React.ComponentProps<'span'>) {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        width: ${euiTheme.border.width.thin};
        height: 63px;
        align-self: center;
        background-color: ${euiTheme.colors.borderBaseSubdued};
      `}
      {...props}
    />
  );
}

function ManagementLandingEnvStatColumn({
  testSubj,
  value,
  label,
}: {
  testSubj: string;
  value: string;
  label: React.ReactNode;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj={testSubj}>
      <EuiTitle size="m">
        <h3>{value}</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        {label}
      </EuiText>
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

interface AttentionNavTarget {
  readonly appId: string;
  readonly path?: string;
  readonly capabilityPath: string;
  readonly label: string;
}

const ATTENTION_ACTION_OPEN_STACK_MONITORING = i18n.translate(
  'management.landing.envHealth.attention.action.openStackMonitoring',
  {
    defaultMessage: 'Open Stack Monitoring',
  }
);

const ATTENTION_REASON_NAV: Record<AttentionReason, AttentionNavTarget> = {
  cluster_red: {
    appId: 'monitoring',
    capabilityPath: 'catalogue.monitoring',
    label: ATTENTION_ACTION_OPEN_STACK_MONITORING,
  },
  cluster_yellow: {
    appId: 'monitoring',
    capabilityPath: 'catalogue.monitoring',
    label: ATTENTION_ACTION_OPEN_STACK_MONITORING,
  },
  unassigned_shards: {
    appId: 'management',
    path: 'data/index_management/indices',
    capabilityPath: 'management.data.index_management',
    label: i18n.translate('management.landing.envHealth.attention.action.unassignedShards', {
      defaultMessage: 'Resolve unassigned shards',
    }),
  },
  health_check_timed_out: {
    appId: 'monitoring',
    capabilityPath: 'catalogue.monitoring',
    label: ATTENTION_ACTION_OPEN_STACK_MONITORING,
  },
};

const ATTENTION_REASON_ORDER: AttentionReason[] = [
  'cluster_red',
  'cluster_yellow',
  'unassigned_shards',
  'health_check_timed_out',
];

function ManagementLandingAttentionIssuesStat({
  reasons,
  capabilities,
  navigateToApp,
}: {
  reasons: AttentionReason[];
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const { euiTheme } = useEuiTheme();
  const [isIssuesPopoverOpen, setIsIssuesPopoverOpen] = useState(false);

  const closeIssuesPopover = useCallback(() => setIsIssuesPopoverOpen(false), []);
  const toggleIssuesPopover = useCallback(() => {
    setIsIssuesPopoverOpen((open) => !open);
  }, []);

  const sortedUniqueReasons = useMemo(() => {
    const unique = [...new Set(reasons)];
    return unique.sort(
      (a, b) => ATTENTION_REASON_ORDER.indexOf(a) - ATTENTION_REASON_ORDER.indexOf(b)
    );
  }, [reasons]);

  const mostSevere = reasons.includes('cluster_red') ? 'danger' : 'warning';
  const issueCount = sortedUniqueReasons.length;

  const handleNavigate = (action: AttentionNavTarget) => {
    navigateToApp(action.appId, action.path !== undefined ? { path: action.path } : {});
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      data-test-subj="managementEnvHealthAttentionIssuesStat"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={mostSevere === 'danger' ? 'errorFilled' : 'warningFilled'}
            size="m"
            color={mostSevere === 'danger' ? 'danger' : 'warning'}
            aria-hidden
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h3
              css={css`
                margin-block: 0;
              `}
            >
              {issueCount}{' '}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPopover
        panelPaddingSize="m"
        isOpen={isIssuesPopoverOpen}
        closePopover={closeIssuesPopover}
        button={
          <EuiLink
            color={mostSevere === 'danger' ? 'danger' : 'warning'}
            onClick={(e) => {
              e.preventDefault();
              toggleIssuesPopover();
            }}
            data-test-subj="managementEnvHealthAttentionIssuesTrigger"
            aria-label={i18n.translate(
              'management.landing.envHealth.attention.issuesTriggerAriaLabel',
              {
                defaultMessage:
                  '{count, plural, one {View issue details — # issue needs attention} other {View issue details — # issues need attention}}',
                values: { count: issueCount },
              }
            )}
            css={css`
              font-size: ${euiTheme.font.scale.s};
              font-weight: ${euiTheme.font.weight.regular};
            `}
          >
            <FormattedMessage
              id="management.landing.envHealth.attention.issuesSummaryLabel"
              defaultMessage="{count, plural, one {issue needs attention} other {issues need attention}}"
              values={{ count: issueCount }}
            />
          </EuiLink>
        }
      >
        <div data-test-subj="managementEnvHealthAttentionIssuesPopover">
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            data-test-subj="managementEnvHealthAttentionIssuesPopoverList"
          >
            {sortedUniqueReasons.map((reason) => {
              const action = ATTENTION_REASON_NAV[reason];
              const canAct = Boolean(get(capabilities, action.capabilityPath));
              const reasonIsDanger = reason === 'cluster_red';
              return (
                <EuiFlexGroup
                  key={reason}
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  wrap={false}
                  data-test-subj="managementEnvHealthAttentionIssueRow"
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={reasonIsDanger ? 'errorFilled' : 'warningFilled'}
                      size="s"
                      color={reasonIsDanger ? 'danger' : 'warning'}
                      aria-hidden
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow css={{ minWidth: 0 }}>
                    <EuiText size="s">{ATTENTION_REASON_LABELS[reason]}</EuiText>
                  </EuiFlexItem>
                  {canAct ? (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        onClick={() => {
                          handleNavigate(action);
                          closeIssuesPopover();
                        }}
                        data-test-subj={`managementEnvHealthAttentionAction-${action.appId}-${(
                          action.path ?? 'default'
                        ).replace(/\//g, '_')}`}
                      >
                        {action.label}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              );
            })}
          </EuiFlexGroup>
        </div>
      </EuiPopover>
    </EuiFlexGroup>
  );
}

function ManagementLandingStatsPanel({
  data,
  capabilities,
  navigateToApp,
}: {
  data: EnvironmentHealthResponse;
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  const pendingCount =
    data.pendingReportsCount ?? MANAGEMENT_LANDING_PENDING_REPORTS_FALLBACK_COUNT;

  const statEntries: Array<{ id: string; content: React.ReactElement }> = [
    {
      id: 'indices',
      content: (
        <ManagementLandingEnvStatColumn
          testSubj="managementEnvHealthIndices"
          value={dash(data.indicesCount)}
          label={
            <FormattedMessage
              id="management.landing.envHealth.indices"
              defaultMessage="{count, plural, one {index} other {indices}}"
              values={{ count: data.indicesCount ?? 0 }}
            />
          }
        />
      ),
    },
    {
      id: 'dataStreams',
      content: (
        <ManagementLandingEnvStatColumn
          testSubj="managementEnvHealthDataStreams"
          value={dash(data.dataStreamsCount)}
          label={
            <FormattedMessage
              id="management.landing.envHealth.dataStreams"
              defaultMessage="{count, plural, one {data stream} other {data streams}}"
              values={{ count: data.dataStreamsCount ?? 0 }}
            />
          }
        />
      ),
    },
    {
      id: 'activeRules',
      content: (
        <ManagementLandingEnvStatColumn
          testSubj="managementEnvHealthActiveRules"
          value={dash(data.activeRulesCount)}
          label={
            <FormattedMessage
              id="management.landing.envHealth.activeRules"
              defaultMessage="{count, plural, one {active rule} other {active rules}}"
              values={{ count: data.activeRulesCount ?? 0 }}
            />
          }
        />
      ),
    },
    {
      id: 'pendingReports',
      content: (
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          data-test-subj="managementEnvHealthPendingReports"
        >
          <EuiTitle size="m">
            <h3>{dash(pendingCount)}</h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="management.landing.envHealth.pendingReports"
              defaultMessage="{count, plural, one {pending report} other {pending reports}}"
              values={{ count: pendingCount }}
            />
            {data.pendingReportsCount === undefined ? (
              <>
                {' '}
                <FormattedMessage
                  id="management.landing.envHealth.pendingReportsFallbackNote"
                  defaultMessage="(demo count)"
                />
              </>
            ) : null}
          </EuiText>
        </EuiFlexGroup>
      ),
    },
  ];

  if (data.attentionReasons.length > 0) {
    statEntries.push({
      id: 'attentionIssues',
      content: (
        <ManagementLandingAttentionIssuesStat
          reasons={data.attentionReasons}
          capabilities={capabilities}
          navigateToApp={navigateToApp}
        />
      ),
    });
  } else if (data.healthStatus === 'green') {
    statEntries.push({
      id: 'healthyReassurance',
      content: <ManagementLandingHealthyReassurance />,
    });
  }

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="managementLandingStatsPanel"
      css={css`
        flex: 1;
        min-height: 0;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="management.landing.envHealth.statsPanelTitle"
              defaultMessage="Environment overview"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexGroup
          gutterSize="m"
          alignItems="flexEnd"
          wrap
          responsive={true}
          css={css`
            width: 100%;
          `}
        >
          {statEntries.map((entry, index) => (
            <React.Fragment key={entry.id}>
              <EuiFlexItem
                grow
                css={
                  entry.id === 'healthyReassurance'
                    ? css`
                        flex: 1 1 auto;
                        min-width: max-content;
                      `
                    : css`
                        flex-basis: 0;
                        min-width: 0;
                      `
                }
              >
                {entry.content}
              </EuiFlexItem>
              {index < statEntries.length - 1 ? (
                <EuiFlexItem grow={false}>
                  <ManagementLandingStatsVerticalRule aria-hidden />
                </EuiFlexItem>
              ) : null}
            </React.Fragment>
          ))}
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function ManagementLandingHeaderDescription({
  loadState,
  data,
  capabilities,
  navigateToApp,
}: {
  loadState: EnvironmentHealthLoadState;
  data: EnvironmentHealthResponse | null;
  capabilities: ApplicationStart['capabilities'];
  navigateToApp: ApplicationStart['navigateToApp'];
}) {
  if (loadState === 'loading' || (loadState === 'ready' && !data)) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="managementLandingHeaderStatsLoading"
        css={css`
          flex: 1;
          min-height: 0;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiSkeletonTitle size="xs" />
          <EuiFlexGroup
            gutterSize="m"
            alignItems="flexEnd"
            wrap
            responsive={true}
            css={css`
              width: 100%;
            `}
          >
            {[0, 1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <EuiFlexItem
                  grow
                  css={css`
                    flex-basis: 0;
                    min-width: 0;
                  `}
                >
                  <EuiSkeletonTitle size="m" />
                </EuiFlexItem>
                {i < 3 ? (
                  <EuiFlexItem grow={false}>
                    <ManagementLandingStatsVerticalRule aria-hidden />
                  </EuiFlexItem>
                ) : null}
              </React.Fragment>
            ))}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <ManagementLandingStatsPanel
      data={data}
      capabilities={capabilities}
      navigateToApp={navigateToApp}
    />
  );
}

export function ManagementLandingHealthyReassurance() {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="managementEnvHealthHealthyReassurance"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" size="m" color="success" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h3
              css={css`
                margin-block: 0;
                white-space: nowrap;
              `}
            >
              <FormattedMessage
                id="management.landing.envHealth.healthyTitle"
                defaultMessage="All clear"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="management.landing.envHealth.healthyBody"
          defaultMessage="Continue monitoring alerts and data ingestion."
        />
      </EuiText>
    </EuiFlexGroup>
  );
}
