/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel, EuiStat, EuiSpacer, useEuiTheme, EuiIconTip } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { ContentInsightsStats } from '@kbn/content-management-content-insights-server';
import { css } from '@emotion/react';
import moment from 'moment';

import { Item } from '../../types';
import { ViewsChart } from './views_chart';
import { useServices } from '../../services';

export const ViewsStats = ({ item }: { item: Item }) => {
  const contentInsightsClient = useServices()?.contentInsightsClient;

  if (!contentInsightsClient) {
    throw new Error('Content insights client is not available');
  }

  const { euiTheme } = useEuiTheme();
  const { data, isLoading } = useQuery(
    ['content-insights:viewed', item.id],
    async () =>
      contentInsightsClient.getStats(item.id, 'viewed').then((response) => ({
        totalDays: getTotalDays(response),
        totalViews: response.count,
        chartData: getChartData(response),
      })),
    {
      staleTime: 0,
      retry: false,
    }
  );

  return (
    <EuiPanel hasBorder paddingSize={'s'}>
      <EuiStat
        titleSize={'s'}
        data-test-subj={'views-stats-total-views'}
        title={data?.totalViews ?? '–'}
        description={
          <>
            <FormattedMessage
              id="contentManagement.contentEditor.viewsStats.viewsLastNDaysLabel"
              defaultMessage="Views (last {n} days)"
              values={{ n: data?.totalDays }}
            />
            <NoViewsTip />
          </>
        }
        isLoading={isLoading}
      />
      <EuiSpacer
        size={'s'}
        css={css`
          border-bottom: ${euiTheme.border.thin};
        `}
      />
      <EuiSpacer size={'m'} />

      <ViewsChart data={data?.chartData ?? []} />
    </EuiPanel>
  );
};

const NoViewsTip = () => (
  <EuiIconTip
    aria-label={i18n.translate('contentManagement.contentEditor.viewsStats.noViewsTipAriaLabel', {
      defaultMessage: 'Additional information',
    })}
    position="top"
    color="inherit"
    iconProps={{ style: { verticalAlign: 'text-bottom', marginLeft: 2 } }}
    css={{ textWrap: 'balance' }}
    type="questionInCircle"
    content={
      <FormattedMessage
        id="contentManagement.contentEditor.viewsStats.noViewsTip"
        defaultMessage="Views are counted every time someone opens a dashboard (after 11-2024)"
      />
    }
  />
);

export function getTotalDays(stats: ContentInsightsStats) {
  return moment.utc().diff(moment.utc(stats.from), 'days');
}

export function getChartData(stats: ContentInsightsStats): Array<[week: number, views: number]> {
  // prepare a map of views by week starting from the first full week till the current week
  const viewsByWeek = new Map<string, number>();

  // we use moment to handle weeks because it is configured with the correct first day of the week from advanced settings
  // by default it is sunday
  const thisWeek = moment().startOf('week');
  const firstFullWeek = moment(stats.from).add(7, 'day').startOf('week');

  // fill the map with weeks starting from the first full week till the current week
  let current = firstFullWeek.clone();
  while (current.isSameOrBefore(thisWeek)) {
    viewsByWeek.set(current.toISOString(), 0);
    current = current.clone().add(1, 'week');
  }

  // fill the map with views per week
  for (let i = 0; i < stats.daily.length; i++) {
    const week = moment(stats.daily[i].date).startOf('week').toISOString();
    if (viewsByWeek.has(week)) {
      viewsByWeek.set(week, viewsByWeek.get(week)! + stats.daily[i].count);
    }
  }

  return Array.from(viewsByWeek.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([date, views]) => [new Date(date).getTime(), views]);
}
