/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiText,
  EuiSpacer,
  EuiListGroup,
  EuiTablePagination,
  EuiToken,
  useEuiTheme,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useMemo, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useWindowSize from 'react-use/lib/useWindowSize';
import type { MetricField, Dimension } from '../../types';
import { getUnitLabel } from '../../common/utils';
import { TabTitleAndDescription } from './tab_title_and_description';
import { calculateFlyoutContentHeight, DEFAULT_MARGIN_BOTTOM } from './get_height';

interface OverviewTabProps {
  metric: MetricField;
  description?: string;
}

const DEFAULT_PAGINATION_SIZE = 20;

export const OverviewTab = ({ metric, description }: OverviewTabProps) => {
  const { euiTheme } = useEuiTheme();
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGINATION_SIZE);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const unitLabel = useMemo(() => getUnitLabel({ unit: metric.unit }), [metric.unit]);

  // Sort dimensions alphabetically by name
  const sortedDimensions = useMemo(() => {
    if (!metric.dimensions || metric.dimensions.length === 0) {
      return [];
    }
    return [...metric.dimensions].sort((a, b) => a.name.localeCompare(b.name));
  }, [metric.dimensions]);

  // Calculate pagination - 0 means show all
  const pageSize = itemsPerPage === 0 ? sortedDimensions.length : itemsPerPage;
  const pageCount = Math.ceil(sortedDimensions.length / pageSize);
  const paginatedDimensions = sortedDimensions.slice(
    activePage * pageSize,
    (activePage + 1) * pageSize
  );

  // Map icon types for dimension field types
  const iconMap = useMemo(
    () =>
      new Map<string, string>([
        ['boolean', 'tokenBoolean'],
        ['ip', 'tokenIP'],
        ['keyword', 'tokenKeyword'],
        ['long', 'tokenNumber'],
        ['integer', 'tokenNumber'],
        ['short', 'tokenNumber'],
        ['byte', 'tokenNumber'],
        ['unsigned_long', 'tokenNumber'],
      ]),
    []
  );

  // Helper function to create description list items
  const createDescriptionListItem = useCallback(
    (title: string, value: React.ReactNode, dataTestSubj?: string) => ({
      label: (
        <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj={dataTestSubj}>
          <EuiFlexItem
            grow={false}
            css={css`
              min-width: ${euiTheme.base * 11.25}px;
            `}
          >
            <EuiText size="xs">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{value}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    }),
    [euiTheme.base]
  );

  // Create description list items
  const descriptionListItems = useMemo(
    () => [
      createDescriptionListItem(
        i18n.translate('metricsExperience.overviewTab.strong.dataStreamLabel', {
          defaultMessage: 'Data stream',
        }),
        <EuiText color="primary" size="s">
          {metric.index}
        </EuiText>
      ),
      createDescriptionListItem(
        i18n.translate('metricsExperience.overviewTab.strong.fieldTypeLabel', {
          defaultMessage: 'Field type',
        }),
        <div>
          <EuiBadge>{metric.type}</EuiBadge>
        </div>
      ),
      ...(unitLabel
        ? [
            createDescriptionListItem(
              i18n.translate('metricsExperience.overviewTab.strong.metricUnitLabel', {
                defaultMessage: 'Metric unit',
              }),
              <EuiBadge>{unitLabel}</EuiBadge>,
              'metricsExperienceFlyoutOverviewTabMetricUnitLabel'
            ),
          ]
        : []),
      ...(metric.instrument
        ? [
            createDescriptionListItem(
              i18n.translate('metricsExperience.overviewTab.strong.metricTypeLabel', {
                defaultMessage: 'Metric type',
              }),
              <div>
                <EuiBadge>{metric.instrument}</EuiBadge>
              </div>,
              'metricsExperienceFlyoutOverviewTabMetricTypeLabel'
            ),
          ]
        : []),
    ],
    [metric.index, metric.type, metric.instrument, unitLabel, createDescriptionListItem]
  );

  useWindowSize(); // trigger re-render on window resize to recalculate the container height

  const containerHeight = containerRef
    ? calculateFlyoutContentHeight(containerRef, DEFAULT_MARGIN_BOTTOM)
    : 0;

  // Create list items from dimensions
  const dimensionListItems = useMemo(
    () =>
      paginatedDimensions.map((dimension: Dimension) => {
        const hasIcon = iconMap.has(dimension.type);
        return {
          label: (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {hasIcon && (
                <EuiFlexItem grow={false}>
                  <EuiToken iconType={iconMap.get(dimension.type) ?? ''} size="s" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="s">{dimension.name}</EuiText>
              </EuiFlexItem>
              {!hasIcon && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{dimension.type}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ),
        };
      }),
    [paginatedDimensions, iconMap]
  );

  return (
    <>
      <TabTitleAndDescription metric={metric} description={description} />

      <EuiPanel
        hasShadow={false}
        hasBorder
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.m};
        `}
      >
        <EuiListGroup
          data-test-subj="metricsExperienceFlyoutOverviewTabDescriptionList"
          listItems={descriptionListItems}
          flush
          gutterSize="none"
          wrapText={false}
          maxWidth={false}
          css={css`
            .euiListGroupItem:not(:last-child) {
              border-bottom: ${euiTheme.border.thin};
            }
            .euiListGroupItem__text {
              padding: ${euiTheme.size.s} ${euiTheme.size.xs};
            }
          `}
        />
      </EuiPanel>
      {metric.dimensions && metric.dimensions.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsLabel">
            <strong>
              {i18n.translate('metricsExperience.overviewTab.strong.dimensionsLabel', {
                defaultMessage: 'Dimensions',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <div ref={setContainerRef}>
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="none"
              css={css`
                padding: ${euiTheme.size.xs} ${euiTheme.size.m};
                ${containerHeight
                  ? css`
                      height: ${containerHeight}px;
                    `
                  : css`
                      max-height: 400px;
                    `}
                display: flex;
                flex-direction: column;
              `}
            >
              <div className="euiScreenReaderOnly" aria-live="assertive" aria-atomic="true">
                {i18n.translate('metricsExperience.overviewTab.dimensionsAnnouncement', {
                  defaultMessage:
                    'Showing {count} dimensions on page {page} of {total}. {dimensions}',
                  values: {
                    count: paginatedDimensions.length,
                    page: activePage + 1,
                    total: pageCount,
                    dimensions: paginatedDimensions.map((d) => `${d.name}`).join('. '),
                  },
                })}
              </div>
              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                css={css`
                  flex: 1;
                  min-height: 0;
                `}
              >
                <EuiFlexItem
                  grow={true}
                  css={css`
                    overflow-y: auto;
                    overflow-x: hidden;
                    min-height: 0;
                  `}
                >
                  <EuiListGroup
                    data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsList"
                    listItems={dimensionListItems}
                    flush
                    gutterSize="none"
                    wrapText={false}
                    maxWidth={false}
                    css={css`
                      .euiListGroupItem {
                        border-bottom: ${euiTheme.border.thin};
                      }
                      .euiListGroupItem__text {
                        padding: ${euiTheme.size.s} ${euiTheme.size.xs};
                      }
                    `}
                  />
                </EuiFlexItem>
                {sortedDimensions.length >= DEFAULT_PAGINATION_SIZE && (
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      padding-top: ${euiTheme.size.s};
                      border-top: ${euiTheme.border.thin};
                    `}
                  >
                    <EuiTablePagination
                      data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsPagination"
                      aria-label={i18n.translate(
                        'metricsExperience.overviewTab.dimensionsPaginationLabel',
                        {
                          defaultMessage: 'Dimensions pagination',
                        }
                      )}
                      pageCount={pageCount}
                      activePage={activePage}
                      onChangePage={setActivePage}
                      itemsPerPage={itemsPerPage}
                      onChangeItemsPerPage={(newItemsPerPage) => {
                        setItemsPerPage(newItemsPerPage);
                        setActivePage(0);
                      }}
                      itemsPerPageOptions={[0, 10, 20, 50]}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
          </div>
        </>
      )}
    </>
  );
};
