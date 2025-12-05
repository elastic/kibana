/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { TabEntityNameConfig } from '@kbn/content-management-table-list-view-table';
import type { DashboardSavedObjectUserContent } from '../types';
import { dashboardListingTabStrings } from '../_dashboard_listing_strings';

const getVisTypeIcon = (visType: string): string => {
  const iconMap: Record<string, string> = {
    area: 'visArea',
    line: 'visLine',
    bar: 'visBarVertical',
    horizontal_bar: 'visBarHorizontal',
    pie: 'visPie',
    markdown: 'visText',
    vega: 'visVega',
    metric: 'visMetric',
    table: 'visTable',
    tagcloud: 'visTagCloud',
    gauge: 'visGauge',
    goal: 'visGoal',
    heatmap: 'visHeatmap',
    timelion: 'visTimelion',
    Maps: 'gisApp',
  };
  return iconMap[visType] || 'visualizeApp';
};

const getTypeColumn = (): EuiBasicTableColumn<DashboardSavedObjectUserContent> => {
  return {
    field: 'type',
    name: i18n.translate('dashboard.listing.table.typeColumnName', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    width: '150px',
    render: (_type: string | undefined, item: DashboardSavedObjectUserContent) => {
      if (item.type === 'dashboard') {
        return (
          <span>
            <EuiIcon
              css={css`
                margin-right: 8px;
                vertical-align: middle;
              `}
              aria-hidden="true"
              type="dashboardApp"
              size="m"
            />
            {i18n.translate('dashboard.listing.table.typeDashboard', {
              defaultMessage: 'Dashboard',
            })}
          </span>
        );
      }

      if (item.type === 'event-annotation-group') {
        return (
          <span>
            <EuiIcon
              css={css`
                margin-right: 8px;
                vertical-align: middle;
              `}
              aria-hidden="true"
              type="annotation"
              size="m"
            />
            {i18n.translate('dashboard.listing.table.typeAnnotationGroup', {
              defaultMessage: 'Annotation group',
            })}
          </span>
        );
      }

      if (item.attributes.visType) {
        const visType = item.attributes.visType;
        return (
          <span>
            <EuiIcon
              css={css`
                margin-right: 8px;
                vertical-align: middle;
              `}
              aria-hidden="true"
              type={getVisTypeIcon(visType)}
              size="m"
            />
            {visType}
          </span>
        );
      }

      return null;
    },
  };
};

const getDataViewColumn = (): EuiBasicTableColumn<DashboardSavedObjectUserContent> => {
  return {
    field: 'attributes.indexPatternId',
    name: i18n.translate('dashboard.listing.table.dataViewColumnName', {
      defaultMessage: 'Data view',
    }),
    sortable: false,
    width: '200px',
    render: (indexPatternId: string) => indexPatternId || '-',
  };
};

export const getTabsConfiguration = (
  dashboardEntityName: string,
  dashboardEntityNamePlural: string
): {
  tabEntityNames: Record<string, TabEntityNameConfig<DashboardSavedObjectUserContent>>;
} => {
  const {
    getDashboardTabName,
    getDashboardEmptyPromptBody,
    getVisualizationTabName,
    getVisualizationEntityName,
    getVisualizationEntityNamePlural,
    getVisualizationEmptyPromptBody,
    getAnnotationGroupTabName,
    getAnnotationGroupEntityName,
    getAnnotationGroupEntityNamePlural,
    getAnnotationGroupEmptyPromptBody,
  } = dashboardListingTabStrings;

  return {
    tabEntityNames: {
      dashboards: {
        tabName: getDashboardTabName(),
        entityName: dashboardEntityName,
        entityNamePlural: dashboardEntityNamePlural,
        emptyPromptBody: getDashboardEmptyPromptBody(),
        columns: {
          customTableColumn: getTypeColumn(),
          showCreatorColumn: true,
        },
      },
      visualizations: {
        tabName: getVisualizationTabName(),
        entityName: getVisualizationEntityName(),
        entityNamePlural: getVisualizationEntityNamePlural(),
        emptyPromptBody: getVisualizationEmptyPromptBody(),
        columns: {
          customTableColumn: getTypeColumn(),
          showCreatorColumn: false,
        },
      },
      'annotation-groups': {
        tabName: getAnnotationGroupTabName(),
        entityName: getAnnotationGroupEntityName(),
        entityNamePlural: getAnnotationGroupEntityNamePlural(),
        emptyPromptBody: getAnnotationGroupEmptyPromptBody(),
        columns: {
          customTableColumn: getDataViewColumn(),
          showCreatorColumn: false,
        },
      },
    },
  };
};
