/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiHighlight,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SidePanelNestedPanelRenderProps } from '@kbn/core-chrome-browser';

import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { dashboardClient } from '../dashboard_client';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';
import { toAbsoluteNavHref } from './to_absolute_nav_href';

interface DashboardSearchResult {
  id: string;
  title: string;
}

const SEARCH_RESULTS_PER_PAGE = 100;

const fetchAllDashboards = async (search?: string): Promise<DashboardSearchResult[]> => {
  await untilPluginStartServicesReady();

  const dashboards: DashboardSearchResult[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while ((page - 1) * SEARCH_RESULTS_PER_PAGE < total) {
    const response = await dashboardClient.search({
      ...(search ? { query: search } : {}),
      per_page: SEARCH_RESULTS_PER_PAGE,
      page,
    });

    total = response.total;

    response.dashboards.forEach(({ id, data, meta }) => {
      if (Boolean(meta?.managed)) {
        return;
      }

      dashboards.push({
        id,
        title: data.title,
      });
    });

    if (response.dashboards.length === 0) {
      break;
    }

    page += 1;
  }

  return dashboards;
};

export const DashboardSearchPanel = ({
  onGoBack,
  onItemClick,
}: SidePanelNestedPanelRenderProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<DashboardSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const debouncedSetQuery = useMemo(
    () => debounce((latestQuery: string) => setDebouncedQuery(latestQuery), 150),
    []
  );

  const setSearchInputRef = useCallback((inputElement: HTMLInputElement | null) => {
    searchInputRef.current = inputElement;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    debouncedSetQuery(query);

    return () => {
      debouncedSetQuery.cancel();
    };
  }, [debouncedSetQuery, query]);

  useEffect(() => {
    let canceled = false;
    setIsLoading(true);

    fetchAllDashboards(debouncedQuery)
      .then((dashboards) => {
        if (canceled) {
          return;
        }

        setResults(dashboards);
        setHasLoadedOnce(true);
        setIsLoading(false);
      })
      .catch(() => {
        if (canceled) {
          return;
        }

        setResults([]);
        setHasLoadedOnce(true);
        setIsLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [debouncedQuery]);

  const isInitialLoading = isLoading && !hasLoadedOnce;

  const panelWrapperStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.m};
    position: relative;
    width: 100%;
  `;

  const resultButtonStyles = css`
    font-weight: ${euiTheme.font.weight.regular};
    padding-block: 6px;
    width: 100%;

    > span {
      justify-content: flex-start;
    }
  `;

  const resultLabelStyles = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const handleResultClick = useCallback(
    (dashboard: DashboardSearchResult, href: string) => {
      onGoBack?.();
      onItemClick({
        href,
        id: `recent_${dashboard.id}`,
        label: dashboard.title,
        panelId: DASHBOARD_APP_ID,
      });
    },
    [onGoBack, onItemClick]
  );

  return (
    <div css={panelWrapperStyles} role="group">
      <EuiFieldSearch
        aria-label={i18n.translate('dashboard.nav.findDashboardInputAriaLabel', {
          defaultMessage: 'Find dashboard',
        })}
        compressed
        data-test-subj="dashboardNavSearchInput"
        fullWidth
        inputRef={setSearchInputRef}
        isLoading={isLoading}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={i18n.translate('dashboard.nav.findDashboardPlaceholder', {
          defaultMessage: 'Type text',
        })}
        prepend={
          onGoBack ? (
            <EuiButtonIcon
              aria-label={i18n.translate('dashboard.nav.searchGoBack', {
                defaultMessage: 'Go back',
              })}
              color="text"
              data-test-subj="dashboardNavSearchGoBack"
              display="empty"
              iconType="chevronSingleLeft"
              onClick={onGoBack}
            />
          ) : undefined
        }
        value={query}
      />
      {isInitialLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : !isLoading && results.length === 0 ? (
        <EuiText color="subdued" size="s">
          {i18n.translate('dashboard.nav.searchDashboardsEmpty', {
            defaultMessage: 'No dashboards found',
          })}
        </EuiText>
      ) : (
        <ul role="none">
          {results.map((dashboard) => {
            const itemId = `dashboard_search_${dashboard.id}`;
            const href = toAbsoluteNavHref(
              coreServices.http.basePath.prepend(
                `/app/${DASHBOARD_APP_ID}#/view/${dashboard.id}`
              )
            );

            return (
              <li key={dashboard.id} role="none">
                <EuiButtonEmpty
                  color="text"
                  css={resultButtonStyles}
                  data-test-subj={`dashboardNavSearchResult-${dashboard.id}`}
                  href={href}
                  id={itemId}
                  onClick={() => handleResultClick(dashboard, href)}
                  size="s"
                  textProps={false}
                >
                  <span css={resultLabelStyles} title={dashboard.title}>
                    <EuiHighlight search={debouncedQuery}>{dashboard.title}</EuiHighlight>
                  </span>
                </EuiButtonEmpty>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
