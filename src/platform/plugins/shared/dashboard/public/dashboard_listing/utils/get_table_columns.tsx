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
import type { DashboardSavedObjectUserContent } from '../types';

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

export const getTypeColumn = (): EuiBasicTableColumn<DashboardSavedObjectUserContent> => {
  return {
    field: 'type',
    name: i18n.translate('dashboard.listing.table.typeColumnName', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    width: '150px',
    render: (_type: string | undefined, item: DashboardSavedObjectUserContent) => {
      // Show Dashboard
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

      // Show Annotation group
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

      // Show visualization type (for all other types)
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

export const getDataViewColumn = (): EuiBasicTableColumn<DashboardSavedObjectUserContent> => {
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
