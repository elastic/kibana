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
  EuiHealth,
  EuiPanel,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  formatNumber,
  Query,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListFilters, useContentListSearch } from '@kbn/content-list';
import type { IndexHealth, ResourceStats } from '../resource_stats';
import {
  HEALTH_FILTER_FIELD,
  healthColors,
  healthLabels,
  readHealthFilter,
} from './resource_health';

const BYTE_NUMBER_FORMAT = '0.0 b';

const resourceHealthLabel = i18n.translate(
  'management.dataManagementOverview.v2.stats.resourceHealth',
  { defaultMessage: 'Resource health' }
);

const residentStorageLabel = i18n.translate(
  'management.dataManagementOverview.v2.stats.residentStorage',
  { defaultMessage: 'Resident storage' }
);

const notAvailableLabel = i18n.translate(
  'management.dataManagementOverview.v2.stats.notAvailable',
  {
    defaultMessage: 'N/A',
  }
);

const tierLabels = {
  hot: i18n.translate('management.dataManagementOverview.v2.stats.tier.hot', {
    defaultMessage: 'Hot',
  }),
  warm: i18n.translate('management.dataManagementOverview.v2.stats.tier.warm', {
    defaultMessage: 'Warm',
  }),
  cold: i18n.translate('management.dataManagementOverview.v2.stats.tier.cold', {
    defaultMessage: 'Cold',
  }),
  frozen: i18n.translate('management.dataManagementOverview.v2.stats.tier.frozen', {
    defaultMessage: 'Frozen',
  }),
} as const;

const formatBytes = (bytes: number): string => formatNumber(bytes, BYTE_NUMBER_FORMAT);

const filterByHealthLabel = (health: string) =>
  i18n.translate('management.dataManagementOverview.v2.stats.health.filter', {
    defaultMessage: 'Filter by {health} health',
    values: { health },
  });

const clearHealthFilterLabel = (health: string) =>
  i18n.translate('management.dataManagementOverview.v2.stats.health.clearFilter', {
    defaultMessage: 'Clear {health} health filter',
    values: { health },
  });

const joinDetails = (parts: string[]): string | undefined =>
  parts.length > 0 ? parts.join(' · ') : undefined;

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

const dividedStatCss = (euiTheme: EuiThemeComputed) => css`
  border-inline-start: ${euiTheme.border.thin};
  padding-inline-start: ${euiTheme.size.l};
`;

const statColumnCss = css`
  display: flex;
  flex-direction: column;
`;

const statBodyCss = css`
  flex-grow: 1;
`;

const statValueCss = (euiTheme: EuiThemeComputed) => css`
  flex-grow: 1;
  padding-block-end: ${euiTheme.size.xs};
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
    <EuiFlexItem
      css={[statColumnCss, divided ? dividedStatCss(euiTheme) : undefined]}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup css={statBodyCss} direction="column" gutterSize="s">
        <EuiText size="s">
          <span>{title}</span>
        </EuiText>
        <EuiFlexGroup
          css={statValueCss(euiTheme)}
          direction="column"
          gutterSize="xs"
          justifyContent="flexEnd"
        >
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
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const healthDividerCss = (euiTheme: EuiThemeComputed) => css`
  width: ${euiTheme.border.width.thin};
  height: 63px;
  background-color: ${euiTheme.colors.borderBaseSubdued};
`;

const healthStatCss = css`
  flex-shrink: 0;
  min-inline-size: max-content;
`;

const healthButtonCss = (euiTheme: EuiThemeComputed, isSelected: boolean) => css`
  appearance: none;
  background: ${isSelected ? euiTheme.colors.backgroundBaseSubdued : 'transparent'};
  border: none;
  border-radius: ${euiTheme.border.radius.medium};
  cursor: pointer;
  inline-size: 100%;
  padding: ${euiTheme.size.xs};
  text-align: start;
  white-space: nowrap;

  &:hover,
  &:focus-visible {
    background: ${euiTheme.colors.backgroundBaseSubdued};
  }
`;

const HealthIndicator = ({
  health,
  value,
  isLoading,
  isSelected,
  onSelect,
}: {
  health: IndexHealth;
  value: number;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: (health: IndexHealth) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = healthLabels[health];
  const indicator = (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isLoading ? (
        <EuiSkeletonTitle
          size="m"
          data-test-subj={`dataManagementOverviewStats-health-${health}-loading`}
        />
      ) : (
        <EuiTitle size="m">
          <h3>
            <EuiHealth
              color={healthColors[health]}
              data-test-subj={`dataManagementOverviewStats-health-${health}`}
              textSize="inherit"
            >
              {formatNumber(value, '0,0')}
            </EuiHealth>
          </h3>
        </EuiTitle>
      )}
      <EuiText color={healthColors[health]}>
        <h5>{label}</h5>
      </EuiText>
    </EuiFlexGroup>
  );

  if (isLoading) {
    return indicator;
  }

  return (
    <button
      aria-label={isSelected ? clearHealthFilterLabel(label) : filterByHealthLabel(label)}
      aria-pressed={isSelected}
      css={healthButtonCss(euiTheme, isSelected)}
      data-test-subj={`dataManagementOverviewStats-health-${health}-filter`}
      onClick={() => onSelect(health)}
      type="button"
    >
      {indicator}
    </button>
  );
};

const HealthDivider = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <span css={healthDividerCss(euiTheme)} />
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
}) => {
  const { queryText, setQueryFromEuiQuery } = useContentListSearch();
  const { filters } = useContentListFilters();
  const selectedHealth = readHealthFilter(filters).include;

  const selectHealth = (health: IndexHealth) => {
    let parsed: Query;
    try {
      parsed = Query.parse(queryText);
    } catch {
      parsed = Query.parse('');
    }
    const cleared = parsed
      .removeOrFieldClauses(HEALTH_FILTER_FIELD)
      .removeSimpleFieldClauses(HEALTH_FILTER_FIELD);
    const next =
      selectedHealth.length === 1 && selectedHealth[0] === health
        ? cleared
        : cleared.addOrFieldValue(HEALTH_FILTER_FIELD, healthLabels[health], true, 'eq');
    setQueryFromEuiQuery(next);
  };

  return (
    <EuiPanel hasBorder data-test-subj="dataManagementOverviewStats" paddingSize="l">
      <EuiFlexGroup alignItems="stretch" gutterSize="l" responsive={false}>
        <EuiFlexItem data-test-subj="dataManagementOverviewStats-health">
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiText size="s">
              <span>{resourceHealthLabel}</span>
            </EuiText>
            <EuiFlexGroup alignItems="flexEnd" gutterSize="m" responsive={false}>
              <EuiFlexItem css={healthStatCss}>
                <HealthIndicator
                  health="red"
                  isLoading={isLoading}
                  isSelected={selectedHealth.includes('red')}
                  onSelect={selectHealth}
                  value={stats?.health.red ?? 0}
                />
              </EuiFlexItem>
              <HealthDivider />
              <EuiFlexItem css={healthStatCss}>
                <HealthIndicator
                  health="yellow"
                  isLoading={isLoading}
                  isSelected={selectedHealth.includes('yellow')}
                  onSelect={selectHealth}
                  value={stats?.health.yellow ?? 0}
                />
              </EuiFlexItem>
              <HealthDivider />
              <EuiFlexItem css={healthStatCss}>
                <HealthIndicator
                  health="green"
                  isLoading={isLoading}
                  isSelected={selectedHealth.includes('green')}
                  onSelect={selectHealth}
                  value={stats?.health.green ?? 0}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        <Stat
          data-test-subj="dataManagementOverviewStats-resident"
          details={stats ? residentBreakdown(stats) : undefined}
          divided={true}
          isLoading={isLoading}
          title={residentStorageLabel}
          value={stats ? residentValue(stats) : notAvailableLabel}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
};
