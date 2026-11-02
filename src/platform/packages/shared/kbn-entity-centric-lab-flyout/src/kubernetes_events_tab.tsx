/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEntityFlyoutServices } from './services_context';

type KubernetesEventType = 'Normal' | 'Warning';

export interface KubernetesPodEvent {
  readonly id: string;
  readonly lastSeenMs: number;
  readonly type: KubernetesEventType;
  readonly reason: string;
  readonly message: string;
  readonly source: string;
  readonly count: number;
}

interface KubernetesEventsTabProps {
  readonly podName: string;
}

const EVENT_TEMPLATES: readonly {
  readonly type: KubernetesEventType;
  readonly reason: string;
  readonly message: (podName: string) => string;
  readonly source: string;
  readonly minutesAgo: number;
  readonly count: number;
}[] = [
  {
    type: 'Normal',
    reason: 'Scheduled',
    message: (pod) => `Successfully assigned default/${pod} to ip-10-0-42-18.ec2.internal`,
    source: 'default-scheduler',
    minutesAgo: 18,
    count: 1,
  },
  {
    type: 'Normal',
    reason: 'Pulling',
    message: () => 'Pulling image "docker.elastic.co/observability/payments-api:2.14.3"',
    source: 'kubelet',
    minutesAgo: 17,
    count: 1,
  },
  {
    type: 'Normal',
    reason: 'Pulled',
    message: () =>
      'Successfully pulled image "docker.elastic.co/observability/payments-api:2.14.3" in 4.2s',
    source: 'kubelet',
    minutesAgo: 17,
    count: 1,
  },
  {
    type: 'Normal',
    reason: 'Created',
    message: () => 'Created container payments-api',
    source: 'kubelet',
    minutesAgo: 16,
    count: 1,
  },
  {
    type: 'Normal',
    reason: 'Started',
    message: () => 'Started container payments-api',
    source: 'kubelet',
    minutesAgo: 16,
    count: 1,
  },
  {
    type: 'Warning',
    reason: 'Unhealthy',
    message: () => 'Readiness probe failed: HTTP probe failed with statuscode: 503',
    source: 'kubelet',
    minutesAgo: 8,
    count: 4,
  },
  {
    type: 'Warning',
    reason: 'BackOff',
    message: () => 'Back-off restarting failed container payments-api in pod',
    source: 'kubelet',
    minutesAgo: 3,
    count: 6,
  },
  {
    type: 'Normal',
    reason: 'Killing',
    message: (pod) => `Stopping container payments-api in pod ${pod}`,
    source: 'kubelet',
    minutesAgo: 1,
    count: 1,
  },
];

const stableHash = (input: string): number => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

/** Demo Kubernetes events for a pod, newest first. */
export const generatePodKubernetesEvents = (podName: string): readonly KubernetesPodEvent[] => {
  const seed = stableHash(podName);
  const now = Date.now();
  const templateCount = 5 + (seed % 4);
  const start = seed % EVENT_TEMPLATES.length;

  const rows: KubernetesPodEvent[] = [];
  for (let index = 0; index < templateCount; index++) {
    const template = EVENT_TEMPLATES[(start + index) % EVENT_TEMPLATES.length];
    const jitterSec = (seed + index * 17) % 90;
    const lastSeenMs =
      now - template.minutesAgo * 60 * 1000 - jitterSec * 1000 + index * 1000;
    rows.push({
      id: `${podName}-${template.reason}-${index}`,
      lastSeenMs,
      type: template.type,
      reason: template.reason,
      message: template.message(podName),
      source: template.source,
      count: template.count + (index % 2),
    });
  }

  return rows.sort((a, b) => b.lastSeenMs - a.lastSeenMs);
};

const formatLastSeen = (lastSeenMs: number): string => {
  const deltaSec = Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000));
  if (deltaSec < 60) {
    return i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.lastSeenSeconds', {
      defaultMessage: '{seconds}s ago',
      values: { seconds: deltaSec },
    });
  }
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) {
    return i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.lastSeenMinutes', {
      defaultMessage: '{minutes}m ago',
      values: { minutes: deltaMin },
    });
  }
  const deltaHours = Math.floor(deltaMin / 60);
  return i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.lastSeenHours', {
    defaultMessage: '{hours}h ago',
    values: { hours: deltaHours },
  });
};

export const KubernetesEventsTab = ({ podName }: KubernetesEventsTabProps) => {
  const { density } = useEntityFlyoutServices();
  const events = useMemo(() => generatePodKubernetesEvents(podName), [podName]);
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = useMemo<Array<EuiBasicTableColumn<KubernetesPodEvent>>>(
    () => [
      {
        field: 'lastSeenMs',
        name: i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.lastSeenColumn', {
          defaultMessage: 'Last seen',
        }),
        render: (lastSeenMs: number) => formatLastSeen(lastSeenMs),
        width: '110px',
      },
      {
        field: 'type',
        name: i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.typeColumn', {
          defaultMessage: 'Type',
        }),
        render: (type: KubernetesEventType) => (
          <EuiBadge color={type === 'Warning' ? 'warning' : 'hollow'}>{type}</EuiBadge>
        ),
        width: '100px',
      },
      {
        field: 'reason',
        name: i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.reasonColumn', {
          defaultMessage: 'Reason',
        }),
        width: '120px',
      },
      {
        field: 'message',
        name: i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.messageColumn', {
          defaultMessage: 'Message',
        }),
        truncateText: true,
      },
      {
        field: 'source',
        name: i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.sourceColumn', {
          defaultMessage: 'Source',
        }),
        width: '140px',
      },
      {
        field: 'count',
        name: i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.countColumn', {
          defaultMessage: 'Count',
        }),
        align: 'right' as const,
        width: '72px',
      },
    ],
    []
  );

  if (events.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="calendar"
        title={
          <h2>
            {i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.empty.title', {
              defaultMessage: 'No Kubernetes events',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.empty.body', {
                defaultMessage: 'No events were recorded for this pod in the selected time range.',
              })}
            </p>
          </EuiText>
        }
        data-test-subj="entityCentricLabKubernetesEventsEmpty"
      />
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.title', {
                defaultMessage: 'Kubernetes events for {podName}',
                values: { podName },
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('entityCentricLabFlyout.flyout.kubernetesEvents.countBadge', {
              defaultMessage:
                '{count} {count, plural, one {event} other {events}}',
              values: { count: events.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        items={events.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)}
        columns={columns}
        tableLayout="auto"
        compressed={density === 'compact'}
        sorting={{
          sort: { field: 'lastSeenMs', direction: 'desc' },
        }}
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: events.length,
          pageSizeOptions: [10, 25, 50],
        }}
        onChange={({ page }: Criteria<KubernetesPodEvent>) => {
          if (page) {
            setPagination({ pageIndex: page.index, pageSize: page.size });
          }
        }}
        data-test-subj="entityCentricLabKubernetesEventsTable"
      />
    </>
  );
};
