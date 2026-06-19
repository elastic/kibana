/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiHighlight,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SidePanelNestedPanelRenderProps } from '@kbn/core-chrome-browser';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { coreServices, uiActionsService } from '../services/kibana_services';
import { toAbsoluteNavHref } from './to_absolute_nav_href';

interface DashboardSearchResult {
  id: string;
  isManaged: boolean;
  title: string;
}

const SEARCH_RESULTS_LIMIT = 30;

async function searchDashboards(search?: string): Promise<DashboardSearchResult[]> {
  const searchAction = await uiActionsService.getAction('searchDashboardAction');

  return new Promise((resolve) => {
    searchAction.execute({
      onResults(dashboards: DashboardSearchResult[]) {
        resolve(dashboards);
      },
      search: {
        query: search,
        per_page: SEARCH_RESULTS_LIMIT,
      },
      trigger: { id: 'searchDashboards' },
    } as ActionExecutionContext);
  });
}

export const DashboardSearchPanel = ({
  onItemClick,
}: SidePanelNestedPanelRenderProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<DashboardSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSetQuery = useMemo(
    () => debounce((latestQuery: string) => setDebouncedQuery(latestQuery), 150),
    []
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [debouncedSetQuery, query]);

  useEffect(() => {
    let canceled = false;
    setIsLoading(true);

    searchDashboards(debouncedQuery)
      .then((dashboards) => {
        if (canceled) {
          return;
        }

        setResults(dashboards.filter((dashboard) => !dashboard.isManaged));
        setIsLoading(false);
      })
      .catch(() => {
        if (canceled) {
          return;
        }

        setResults([]);
        setIsLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [debouncedQuery]);

  const searchBoxStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
  `;

  const statusStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
  `;

  const resultButtonStyles = css`
    font-weight: ${euiTheme.font.weight.regular};
    padding-block: 6px;
    padding-inline: ${euiTheme.size.s};
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

  return (
    <>
      <div css={searchBoxStyles}>
        <EuiFieldSearch
          aria-label={i18n.translate('dashboard.nav.searchDashboardsInputAriaLabel', {
            defaultMessage: 'Search dashboards',
          })}
          data-test-subj="dashboardNavSearchInput"
          fullWidth
          isLoading={isLoading}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={i18n.translate('dashboard.nav.searchDashboardsPlaceholder', {
            defaultMessage: 'Search dashboards',
          })}
          value={query}
        />
      </div>
      {isLoading ? (
        <div css={statusStyles}>
          <EuiLoadingSpinner size="m" />
        </div>
      ) : results.length === 0 ? (
        <div css={statusStyles}>
          <EuiText color="subdued" size="s">
            {i18n.translate('dashboard.nav.searchDashboardsEmpty', {
              defaultMessage: 'No dashboards found',
            })}
          </EuiText>
        </div>
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
                  onClick={() =>
                    onItemClick({
                      href,
                      id: itemId,
                      label: dashboard.title,
                    })
                  }
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
    </>
  );
};
