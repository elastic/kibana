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
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { FieldNameWithIcon } from '@kbn/react-field';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useWindowSize from 'react-use/lib/useWindowSize';
import { isNonLocalIndexName } from '@kbn/es-query';
import { TabTitleAndDescription } from '../components';
import { calculateFlyoutContentHeight, DEFAULT_MARGIN_BOTTOM } from '../utils';
import type { Dimension, ParsedMetricItem } from '../../../types';
import { OverviewTabMetadata } from './overview_tab_metadata';
import { METRIC_SOURCE_KIND, useMetricSourceKind } from '../hooks/use_metric_source_kind';
import { useStreamsFieldRenderer } from '../hooks/use_streams_field_renderer';

interface OverviewTabProps {
  metricItem: ParsedMetricItem;
  description?: string;
}

const DEFAULT_PAGINATION_SIZE = 20;

export const OverviewTab = ({ metricItem, description }: OverviewTabProps) => {
  const { euiTheme } = useEuiTheme();
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGINATION_SIZE);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const localIndexName = isNonLocalIndexName(metricItem.dataStream)
    ? undefined
    : metricItem.dataStream;

  const { kind: sourceKind } = useMetricSourceKind({
    name: localIndexName,
    fallback: METRIC_SOURCE_KIND.DATA_STREAM,
  });
  const renderStreamField = useStreamsFieldRenderer();

  const streamSection =
    localIndexName && sourceKind === METRIC_SOURCE_KIND.DATA_STREAM && renderStreamField
      ? renderStreamField({ streamName: localIndexName })
      : null;

  const staticIndexName = useMemo(() => {
    if (streamSection || !metricItem.dataStream) {
      return undefined;
    }

    return {
      indexName: metricItem.dataStream,
      kind: sourceKind,
    };
  }, [metricItem.dataStream, sourceKind, streamSection]);

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

      {streamSection}

      <OverviewTabMetadata metricItem={metricItem} staticIndexName={staticIndexName} />

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
