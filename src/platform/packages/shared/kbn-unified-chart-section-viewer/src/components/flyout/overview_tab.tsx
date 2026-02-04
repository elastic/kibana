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
  EuiDescriptionList,
  EuiListGroup,
  EuiTablePagination,
  EuiToken,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { MetricField, Dimension } from '../../types';
import { getUnitLabel } from '../../common/utils';
import { TabTitleAndDescription } from './tab_title_and_description';
interface OverviewTabProps {
  metric: MetricField;
  description?: string;
}

const DEFAULT_PAGINATION_SIZE = 20;

export const OverviewTab = ({ metric, description }: OverviewTabProps) => {
  const { euiTheme } = useEuiTheme();
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGINATION_SIZE);

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

  // Create list items from dimensions
  const dimensionListItems = paginatedDimensions.map((dimension: Dimension) => {
    const hasIcon = iconMap.has(dimension.type);
    return {
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.xs }}>
          {hasIcon && <EuiToken iconType={iconMap.get(dimension.type)!} size="s" />}
          <EuiText size="s">{dimension.name}</EuiText>
          {!hasIcon && (
            <EuiBadge color="hollow" style={{ marginLeft: euiTheme.size.xs }}>
              {dimension.type}
            </EuiBadge>
          )}
        </div>
      ),
    };
  });

  return (
    <>
      <TabTitleAndDescription metric={metric} description={description} />

      <EuiDescriptionList
        compressed
        rowGutterSize="m"
        data-test-subj="metricsExperienceFlyoutOverviewTabDescriptionList"
        listItems={[
          {
            title: (
              <EuiText size="s">
                <strong>
                  {i18n.translate('metricsExperience.overviewTab.strong.dataStreamLabel', {
                    defaultMessage: 'Data stream',
                  })}
                </strong>
              </EuiText>
            ),
            description: (
              <EuiText color="primary" size="s">
                {metric.index}
              </EuiText>
            ),
          },
          {
            title: (
              <EuiText size="s">
                <strong>
                  {i18n.translate('metricsExperience.overviewTab.strong.fieldTypeLabel', {
                    defaultMessage: 'Field type',
                  })}
                </strong>
                <EuiSpacer size="xs" />
              </EuiText>
            ),
            description: <EuiBadge>{metric.type}</EuiBadge>,
          },
          ...(unitLabel
            ? [
                {
                  title: (
                    <EuiText
                      size="s"
                      data-test-subj="metricsExperienceFlyoutOverviewTabMetricUnitLabel"
                    >
                      <strong>
                        {i18n.translate('metricsExperience.overviewTab.strong.metricUnitLabel', {
                          defaultMessage: 'Metric unit',
                        })}
                      </strong>
                      <EuiSpacer size="xs" />
                    </EuiText>
                  ),
                  description: <EuiBadge>{unitLabel}</EuiBadge>,
                },
              ]
            : []),
          ...(metric.instrument
            ? [
                {
                  title: (
                    <EuiText
                      size="s"
                      data-test-subj="metricsExperienceFlyoutOverviewTabMetricTypeLabel"
                    >
                      <strong>
                        {i18n.translate('metricsExperience.overviewTab.strong.metricTypeLabel', {
                          defaultMessage: 'Metric type',
                        })}
                      </strong>
                      <EuiSpacer size="xs" />
                    </EuiText>
                  ),
                  description: <EuiBadge>{metric.instrument}</EuiBadge>,
                },
              ]
            : []),
        ]}
      />

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
          <div className="euiScreenReaderOnly" aria-live="assertive" aria-atomic="true">
            {i18n.translate('metricsExperience.overviewTab.dimensionsAnnouncement', {
              defaultMessage: 'Showing {count} dimensions on page {page} of {total}. {dimensions}',
              values: {
                count: paginatedDimensions.length,
                page: activePage + 1,
                total: pageCount,
                dimensions: paginatedDimensions.map((d) => `${d.name}`).join('. '),
              },
            })}
          </div>
          <EuiListGroup
            data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsList"
            listItems={dimensionListItems}
            flush
            gutterSize="s"
            wrapText={false}
            css={css`
              .euiListGroupItem__text {
                padding-inline: 0;
                min-block-size: ${euiTheme.size.base};
              }
              gap: 0px;
            `}
          />
          <EuiSpacer size="s" />
          {sortedDimensions.length >= DEFAULT_PAGINATION_SIZE && (
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
          )}
        </>
      )}
    </>
  );
};
