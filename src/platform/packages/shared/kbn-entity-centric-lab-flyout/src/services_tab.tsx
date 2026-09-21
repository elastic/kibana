/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type SloStatus = 'Met' | 'Breaching' | 'Degrading' | 'No SLO';

interface HostedService {
  readonly name: string;
  readonly environment: string;
  readonly sloStatus: SloStatus;
  readonly sloValue: string;
  readonly language: string;
  readonly transactionsPerMin: number;
  readonly errorRate: number;
}

interface ServicesTabProps {
  readonly entityName: string;
}

const SLO_BADGE_COLOR: Record<SloStatus, string> = {
  Met: 'success',
  Breaching: 'danger',
  Degrading: 'warning',
  'No SLO': 'hollow',
};

const generateHostedServices = (hostName: string): readonly HostedService[] => {
  const seed = hostName.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const rng = (n: number): number => ((seed * 9301 + 49297) % 233280) % n;

  const servicePool: readonly HostedService[] = [
    {
      name: 'payments-service',
      environment: 'production',
      sloStatus: 'Met',
      sloValue: '99.97%',
      language: 'Java',
      transactionsPerMin: 1243,
      errorRate: 0.02,
    },
    {
      name: 'auth-service',
      environment: 'production',
      sloStatus: 'Breaching',
      sloValue: '98.12%',
      language: 'Go',
      transactionsPerMin: 3891,
      errorRate: 1.88,
    },
    {
      name: 'order-service',
      environment: 'production',
      sloStatus: 'Met',
      sloValue: '99.85%',
      language: 'Node.js',
      transactionsPerMin: 872,
      errorRate: 0.15,
    },
    {
      name: 'notification-service',
      environment: 'staging',
      sloStatus: 'Degrading',
      sloValue: '99.21%',
      language: 'Python',
      transactionsPerMin: 412,
      errorRate: 0.79,
    },
    {
      name: 'inventory-service',
      environment: 'production',
      sloStatus: 'Met',
      sloValue: '99.99%',
      language: 'Java',
      transactionsPerMin: 2034,
      errorRate: 0.01,
    },
    {
      name: 'search-service',
      environment: 'production',
      sloStatus: 'No SLO',
      sloValue: '—',
      language: 'Rust',
      transactionsPerMin: 5210,
      errorRate: 0.04,
    },
    {
      name: 'user-profile-service',
      environment: 'production',
      sloStatus: 'Met',
      sloValue: '99.91%',
      language: 'Go',
      transactionsPerMin: 1580,
      errorRate: 0.09,
    },
    {
      name: 'recommendation-engine',
      environment: 'production',
      sloStatus: 'Degrading',
      sloValue: '99.34%',
      language: 'Python',
      transactionsPerMin: 290,
      errorRate: 0.66,
    },
  ];

  const count = 2 + rng(5);
  const start = rng(servicePool.length);
  const result: HostedService[] = [];
  for (let idx = 0; idx < count; idx++) {
    result.push(servicePool[(start + idx) % servicePool.length]);
  }
  return result;
};

export const ServicesTab = ({ entityName }: ServicesTabProps) => {
  const services = useMemo(() => generateHostedServices(entityName), [entityName]);

  const columns = useMemo<Array<EuiBasicTableColumn<HostedService>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.nameColumn', {
          defaultMessage: 'Service',
        }),
        render: (name: string) => (
          <EuiLink onClick={() => {}}>
            {name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
      },
      {
        field: 'environment',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.envColumn', {
          defaultMessage: 'Environment',
        }),
        render: (env: string) => (
          <EuiBadge color="hollow">{env}</EuiBadge>
        ),
      },
      {
        field: 'sloStatus',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.sloColumn', {
          defaultMessage: 'SLO',
        }),
        render: (status: SloStatus, item: HostedService) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={SLO_BADGE_COLOR[status]}>{status}</EuiBadge>
            </EuiFlexItem>
            {item.sloValue !== '—' ? (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">{item.sloValue}</EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'transactionsPerMin',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.tpmColumn', {
          defaultMessage: 'TPM',
        }),
        render: (tpm: number) => (
          <EuiText size="s">{tpm.toLocaleString()}</EuiText>
        ),
        align: 'right' as const,
      },
      {
        field: 'errorRate',
        name: i18n.translate('entityCentricLabFlyout.flyout.services.errorRateColumn', {
          defaultMessage: 'Error rate',
        }),
        render: (rate: number) => (
          <EuiText size="s" color={rate > 1 ? 'danger' : 'subdued'}>
            {rate.toFixed(2)}%
          </EuiText>
        ),
        align: 'right' as const,
      },
    ],
    []
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('entityCentricLabFlyout.flyout.services.title', {
                defaultMessage: 'Services running on {hostName}',
                values: { hostName: entityName },
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('entityCentricLabFlyout.flyout.services.count', {
              defaultMessage: '{count} {count, plural, one {service} other {services}}',
              values: { count: services.length },
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={services as HostedService[]}
        columns={columns}
        tableLayout="auto"
        tableLayout="auto"
      />
      <EuiSpacer size="m" />
      <EuiLink onClick={() => {}} external>
        {i18n.translate('entityCentricLabFlyout.flyout.services.viewAllInApm', {
          defaultMessage: 'View all services in APM',
        })}
      </EuiLink>
    </>
  );
};
