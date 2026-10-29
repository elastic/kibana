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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  formatNumber,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ResourceStats } from './resource_stats';

const BYTE_NUMBER_FORMAT = '0.0 b';

const totalResourcesLabel = i18n.translate(
  'management.dataManagementOverview.stats.totalResources',
  { defaultMessage: 'Total resources' }
);

const residentStorageLabel = i18n.translate(
  'management.dataManagementOverview.stats.residentStorage',
  { defaultMessage: 'Resident storage' }
);

const federatedCapacityLabel = i18n.translate(
  'management.dataManagementOverview.stats.federatedCapacity',
  { defaultMessage: 'Federated capacity' }
);

const notAvailableLabel = i18n.translate('management.dataManagementOverview.stats.notAvailable', {
  defaultMessage: 'N/A',
});

const tierLabels = {
  hot: i18n.translate('management.dataManagementOverview.stats.tier.hot', {
    defaultMessage: 'Hot',
  }),
  warm: i18n.translate('management.dataManagementOverview.stats.tier.warm', {
    defaultMessage: 'Warm',
  }),
  cold: i18n.translate('management.dataManagementOverview.stats.tier.cold', {
    defaultMessage: 'Cold',
  }),
  frozen: i18n.translate('management.dataManagementOverview.stats.tier.frozen', {
    defaultMessage: 'Frozen',
  }),
} as const;

const formatBytes = (bytes: number): string => formatNumber(bytes, BYTE_NUMBER_FORMAT);

const joinDetails = (parts: string[]): string | undefined =>
  parts.length > 0 ? parts.join(' · ') : undefined;

const countLabel = (count: number, message: string): string | undefined =>
  count > 0 ? message : undefined;

const resourceBreakdown = (stats: ResourceStats): string | undefined => {
  const { counts } = stats;
  return joinDetails(
    [
      countLabel(
        counts.indices,
        i18n.translate('management.dataManagementOverview.stats.count.indices', {
          defaultMessage: '{count, plural, one {# index} other {# indices}}',
          values: { count: counts.indices },
        })
      ),
      countLabel(
        counts.dataStreams,
        i18n.translate('management.dataManagementOverview.stats.count.dataStreams', {
          defaultMessage: '{count, plural, one {# data stream} other {# data streams}}',
          values: { count: counts.dataStreams },
        })
      ),
      countLabel(
        counts.streams,
        i18n.translate('management.dataManagementOverview.stats.count.streams', {
          defaultMessage: '{count, plural, one {# stream} other {# streams}}',
          values: { count: counts.streams },
        })
      ),
      countLabel(
        counts.lookup,
        i18n.translate('management.dataManagementOverview.stats.count.lookup', {
          defaultMessage: '{count, plural, one {# lookup} other {# lookup}}',
          values: { count: counts.lookup },
        })
      ),
      countLabel(
        counts.federated,
        i18n.translate('management.dataManagementOverview.stats.count.federated', {
          defaultMessage: '{count, plural, one {# federated} other {# federated}}',
          values: { count: counts.federated },
        })
      ),
      countLabel(
        counts.views,
        i18n.translate('management.dataManagementOverview.stats.count.views', {
          defaultMessage: '{count, plural, one {# view} other {# views}}',
          values: { count: counts.views },
        })
      ),
      countLabel(
        counts.vector,
        i18n.translate('management.dataManagementOverview.stats.count.vector', {
          defaultMessage: '{count, plural, one {# vector} other {# vector}}',
          values: { count: counts.vector },
        })
      ),
    ].filter((part): part is string => part != null)
  );
};

const sourceTypeLabel = (type: string): string => {
  switch (type) {
    case 's3':
      return i18n.translate('management.dataManagementOverview.stats.source.s3', {
        defaultMessage: 'S3',
      });
    case 'gcs':
      return i18n.translate('management.dataManagementOverview.stats.source.gcs', {
        defaultMessage: 'GCS',
      });
    case 'azure':
      return i18n.translate('management.dataManagementOverview.stats.source.azure', {
        defaultMessage: 'Azure',
      });
    case 'snowflake':
      return i18n.translate('management.dataManagementOverview.stats.source.snowflake', {
        defaultMessage: 'Snowflake',
      });
    default:
      return type;
  }
};

const residentBreakdown = (stats: ResourceStats): string | undefined => {
  if (!stats.resident.known) {
    return undefined;
  }
  const { hot, warm, cold, frozen } = stats.resident;
  return joinDetails([
    `${tierLabels.hot} ${formatBytes(hot)}`,
    `${tierLabels.warm} ${formatBytes(warm)}`,
    `${tierLabels.cold} ${formatBytes(cold)}`,
    `${tierLabels.frozen} ${formatBytes(frozen)}`,
  ]);
};

const residentValue = (stats: ResourceStats): string => {
  if (!stats.resident.known) {
    return notAvailableLabel;
  }
  const { hot, warm, cold, frozen } = stats.resident;
  return formatBytes(hot + warm + cold + frozen);
};

const federatedValue = (stats: ResourceStats): string =>
  stats.federatedSources.length === 0 ? formatBytes(0) : notAvailableLabel;

const dividedStatCss = (euiTheme: EuiThemeComputed) => css`
  border-inline-start: ${euiTheme.border.thin};
  padding-inline-start: ${euiTheme.size.l};
`;

const Stat = ({
  title,
  value,
  details,
  isLoading,
  divided,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  value: string;
  details?: string;
  isLoading: boolean;
  divided: boolean;
  'data-test-subj': string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem css={divided ? dividedStatCss(euiTheme) : undefined} data-test-subj={dataTestSubj}>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiText size="s">
          <span>{title}</span>
        </EuiText>
        {isLoading ? (
          <EuiSkeletonTitle size="m" data-test-subj={`${dataTestSubj}-loading`} />
        ) : (
          <EuiTitle size="m">
            <h3>{value}</h3>
          </EuiTitle>
        )}
        {details ? (
          <EuiText size="xs" color="subdued">
            <span>{details}</span>
          </EuiText>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

/** Summary counts and storage, shown between the toolbar and the resources table. */
export const ResourceStatsPanel = ({
  stats,
  isLoading,
}: {
  stats?: ResourceStats;
  isLoading: boolean;
}) => (
  <EuiPanel hasBorder data-test-subj="dataManagementOverviewStats" paddingSize="l">
    <EuiFlexGroup alignItems="stretch" gutterSize="l" responsive={false}>
      <Stat
        data-test-subj="dataManagementOverviewStats-total"
        details={stats ? resourceBreakdown(stats) : undefined}
        divided={false}
        isLoading={isLoading}
        title={totalResourcesLabel}
        value={stats ? formatNumber(stats.total, '0,0') : notAvailableLabel}
      />
      <Stat
        data-test-subj="dataManagementOverviewStats-resident"
        details={stats ? residentBreakdown(stats) : undefined}
        divided={true}
        isLoading={isLoading}
        title={residentStorageLabel}
        value={stats ? residentValue(stats) : notAvailableLabel}
      />
      <Stat
        data-test-subj="dataManagementOverviewStats-federated"
        details={
          stats && stats.federatedSources.length > 0
            ? joinDetails(stats.federatedSources.map(sourceTypeLabel))
            : undefined
        }
        divided={true}
        isLoading={isLoading}
        title={federatedCapacityLabel}
        value={stats ? federatedValue(stats) : notAvailableLabel}
      />
    </EuiFlexGroup>
  </EuiPanel>
);
