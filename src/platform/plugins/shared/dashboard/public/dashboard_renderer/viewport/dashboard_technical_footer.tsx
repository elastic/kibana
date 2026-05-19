/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useEffect, useRef, useState } from 'react';

import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { dashboardKibanaVersion } from '../../services/kibana_services';

const FOOTER_HEIGHT_PX = 100;

function formatRelativeRefreshAge(msAgo: number): string {
  const secondsTotal = Math.max(0, Math.floor(msAgo / 1000));
  if (secondsTotal < 90) {
    return i18n.translate('dashboard.viewport.technicalFooter.lastRefreshSeconds', {
      defaultMessage: 'Last refresh: {seconds, plural, one {# second ago} other {# seconds ago}}',
      values: { seconds: secondsTotal },
    });
  }
  const minutes = Math.floor(secondsTotal / 60);
  if (minutes < 120) {
    return i18n.translate('dashboard.viewport.technicalFooter.lastRefreshMinutes', {
      defaultMessage: 'Last refresh: {minutes, plural, one {# minute ago} other {# minutes ago}}',
      values: { minutes },
    });
  }
  const hours = Math.floor(minutes / 60);
  return i18n.translate('dashboard.viewport.technicalFooter.lastRefreshHours', {
    defaultMessage: 'Last refresh: {hours, plural, one {# hour ago} other {# hours ago}}',
    values: { hours },
  });
}

export const DashboardTechnicalFooter = () => {
  const dashboardApi = useDashboardApi();
  const { euiTheme } = useEuiTheme();
  const [viewMode, dataViews] = useBatchedPublishingSubjects(
    dashboardApi.viewMode$,
    dashboardApi.dataViews$
  );
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [, setRelativeTick] = useState(0);
  const prevLoadingRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const sub = dashboardApi.dataLoading$.subscribe((isLoading) => {
      const prev = prevLoadingRef.current;
      if (prev === true && isLoading === false) {
        setLastRefreshAt(Date.now());
      } else if (prev === undefined && isLoading === false) {
        setLastRefreshAt(Date.now());
      }
      prevLoadingRef.current = isLoading;
    });
    return () => sub.unsubscribe();
  }, [dashboardApi]);

  useEffect(() => {
    if (lastRefreshAt === null) return;
    const id = window.setInterval(() => setRelativeTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [lastRefreshAt]);

  if (viewMode === 'print') {
    return null;
  }

  const kibanaVersion =
    dashboardKibanaVersion.trim() ||
    i18n.translate('dashboard.viewport.technicalFooter.unknownVersion', {
      defaultMessage: 'unknown',
    });

  const dataViewTitles = Array.from(
    new Set(
      (dataViews ?? [])
        .map((dv) => dv.getName())
        .filter((title): title is string => Boolean(title && title.trim().length))
    )
  );

  const dataComingLabel = i18n.translate('dashboard.viewport.technicalFooter.dataComingFrom', {
    defaultMessage: 'Source:',
  });

  const noDataViewsLabel = i18n.translate('dashboard.viewport.technicalFooter.noDataViews', {
    defaultMessage: 'No data views reported by panels yet.',
  });

  const kibanaLine = i18n.translate('dashboard.viewport.technicalFooter.kibanaVersion', {
    defaultMessage: 'Kibana {version}',
    values: { version: kibanaVersion },
  });

  const lastRefreshLine =
    lastRefreshAt === null
      ? i18n.translate('dashboard.viewport.technicalFooter.lastRefreshPending', {
          defaultMessage: 'Last refresh: pending first load',
        })
      : formatRelativeRefreshAge(Date.now() - lastRefreshAt);

  const dataSourcesLine = dataViewTitles.length > 0 ? dataViewTitles.join(', ') : noDataViewsLabel;

  return (
    <div
      className="dshDashboardTechnicalFooter"
      data-test-subj="dshDashboardTechnicalFooter"
      css={footerStyles(euiTheme)}
    >
      <div css={rowStyles(euiTheme)}>
        <div css={leftClusterStyles}>
          <span css={labelStyles}>{dataComingLabel}</span>
          <span css={commaListStyles} title={dataSourcesLine}>
            {dataSourcesLine}
          </span>
        </div>
        <div css={rightClusterStyles(euiTheme)}>
          <span css={nowrapStyles}>{lastRefreshLine}</span>
          <span css={nowrapStyles}>{kibanaLine}</span>
        </div>
      </div>
    </div>
  );
};

const labelStyles = css({
  flexShrink: 0,
  fontWeight: 600,
  color: 'inherit',
});

const commaListStyles = css({
  flex: '1 1 auto',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const nowrapStyles = css({
  whiteSpace: 'nowrap',
});

const rowStyles = ({ size, colors }: UseEuiTheme['euiTheme']) =>
  css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: size.m,
    width: '100%',
    lineHeight: 1.4,
    color: colors.textSubdued,
  });

const leftClusterStyles = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.35rem',
  flex: '1 1 auto',
  minWidth: 0,
});

const rightClusterStyles = ({ size }: UseEuiTheme['euiTheme']) =>
  css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: size.m,
    flex: '0 0 auto',
  });

const footerStyles = (theme: UseEuiTheme['euiTheme']) =>
  css({
    boxSizing: 'border-box',
    width: '100%',
    paddingInline: theme.size.s,
    paddingTop: theme.size.s,
    paddingBottom: theme.size.s,
    minHeight: `${FOOTER_HEIGHT_PX}px`,
    borderTop: `1px solid ${theme.colors.borderBaseSubdued}`,
    marginTop: theme.size.m,
    fontFamily: "'Roboto Mono', monospace",
    fontSize: 12,
  });
