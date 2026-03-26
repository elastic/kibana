/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiText,
  EuiSpacer,
  EuiListGroup,
  EuiTablePagination,
  useEuiTheme,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FieldNameWithIcon } from '@kbn/react-field';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useWindowSize from 'react-use/lib/useWindowSize';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram/types';
import { getUnitLabel } from '../../../common/utils';
import { TabTitleAndDescription, MetricTypeBadge, BadgeGroup, DataStreamLink } from '../components';
import { useStreamsNavigation } from '../hooks/use_streams_navigation';
import { calculateFlyoutContentHeight, DEFAULT_MARGIN_BOTTOM } from '../utils';
import type { Dimension, ParsedMetricItem } from '../../../types';
import { OverviewTabMetadata } from './overview_tab_metadata';

interface OverviewTabProps {
  metricItem: ParsedMetricItem;
  description?: string;
  services: UnifiedHistogramServices;
}

const DEFAULT_PAGINATION_SIZE = 20;

export const OverviewTab = ({ metricItem, description, services }: OverviewTabProps) => {
  const { euiTheme } = useEuiTheme();
  const { getStreamUrl } = useStreamsNavigation(services);
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGINATION_SIZE);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Sort dimensions alphabetically by name
  const sortedDimensions = useMemo(() => {
    if (!metricItem.dimensionFields || metricItem.dimensionFields.length === 0) {
      return [];
    }
    return [...metricItem.dimensionFields].sort((a, b) => a.name.localeCompare(b.name));
  }, [metricItem.dimensionFields]);

  // Calculate pagination - 0 means show all
  const pageSize = itemsPerPage === 0 ? sortedDimensions.length : itemsPerPage;
  const pageCount = Math.ceil(sortedDimensions.length / pageSize);
  const paginatedDimensions = sortedDimensions.slice(
    activePage * pageSize,
    (activePage + 1) * pageSize
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

  const sourceLabel = metricItem.isDataStream
    ? i18n.translate('metricsExperience.overviewTab.strong.dataStreamLabel', {
        defaultMessage: 'Data stream',
      })
    : i18n.translate('metricsExperience.overviewTab.strong.indexLabel', {
        defaultMessage: 'Index',
      });

  const streamUrl = metricItem.isDataStream ? getStreamUrl(metricItem.dataStream) : undefined;

  const descriptionListItems = useMemo(
    () => [
      createDescriptionListItem(
        sourceLabel,
        <DataStreamLink dataStream={metricItem.dataStream} streamUrl={streamUrl} />
      ),
      createDescriptionListItem(
        i18n.translate('metricsExperience.overviewTab.strong.fieldTypeLabel', {
          defaultMessage: 'Field type',
        }),
        <BadgeGroup
          items={metricItem.fieldTypes}
          isNoValue={(fieldType) => fieldType === ES_FIELD_TYPES.NULL}
          renderItem={(fieldType, index) => (
            <EuiBadge key={`${fieldType}-${index}`}>{fieldType}</EuiBadge>
          )}
        />
      ),
      createDescriptionListItem(
        i18n.translate('metricsExperience.overviewTab.strong.metricUnitLabel', {
          defaultMessage: 'Metric unit',
        }),
        <BadgeGroup
          items={metricItem.units}
          renderItem={(unit, index) => (
            <EuiBadge key={`${unit}-${index}`}>{getUnitLabel({ unit })}</EuiBadge>
          )}
        />,
        'metricsExperienceFlyoutOverviewTabMetricUnitLabel'
      ),
      createDescriptionListItem(
        i18n.translate('metricsExperience.overviewTab.strong.metricTypeLabel', {
          defaultMessage: 'Metric type',
        }),
        <BadgeGroup
          items={metricItem.metricTypes}
          renderItem={(metricType, index) => (
            <MetricTypeBadge key={`${metricType}-${index}`} instrument={metricType} />
          )}
        />,
        'metricsExperienceFlyoutOverviewTabMetricTypeLabel'
      ),
    ],
    [
      sourceLabel,
      streamUrl,
      metricItem.dataStream,
      metricItem.fieldTypes,
      metricItem.metricTypes,
      metricItem.units,
      createDescriptionListItem,
    ]
  );

  useWindowSize(); // trigger re-render on window resize to recalculate the container height

  const containerHeight = containerRef
    ? calculateFlyoutContentHeight(containerRef, DEFAULT_MARGIN_BOTTOM)
    : 0;

  // Create list items from dimensions
  const dimensionListItems = useMemo(
    () =>
      paginatedDimensions.map((dimension: Dimension) => {
        return {
          'data-test-subj': `metricsExperienceFlyoutOverviewTabDimensionItem-${dimension.name}`,
          label: (
            <EuiText size="s">
              <FieldNameWithIcon name={dimension.name} type={dimension.type} />
            </EuiText>
          ),
        };
      }),
    [paginatedDimensions]
  );

  return (
    <div data-test-subj="metricsExperienceFlyoutOverviewTabContent">
      <TabTitleAndDescription metricItem={metricItem} description={description} />

      <OverviewTabMetadata metricItem={metricItem} />

      {metricItem.dimensionFields && metricItem.dimensionFields.length > 0 && (
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
                  tabIndex={0}
                  aria-label={i18n.translate(
                    'metricsExperience.overviewTab.dimensionsScrollableRegion',
                    {
                      defaultMessage: 'Scrollable dimensions list',
                    }
                  )}
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
    </div>
  );
};
