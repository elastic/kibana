/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import useMount from 'react-use/lib/useMount';

import { EuiCodeBlock, EuiFlexGroup, EuiForm, EuiFormRow, EuiLoadingContent } from '@elastic/eui';
import { FilterableEmbeddable, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import { css } from '@emotion/react';
import {
  type AggregateQuery,
  type Filter,
  getAggregateQueryMode,
  isOfQueryType,
} from '@kbn/es-query';

import { FiltersNotificationActionContext } from './filters_notification_action';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';
import { DashboardContainer } from '../dashboard_container/embeddable/dashboard_container';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
}

export function FiltersNotificationPopoverContents({ context }: FiltersNotificationProps) {
  const { embeddable } = context;
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [queryString, setQueryString] = useState<string>('');
  const [queryLanguage, setQueryLanguage] = useState<'sql' | 'esql' | undefined>();

  const dataViews = useMemo(
    () => (embeddable.getRoot() as DashboardContainer)?.getAllDataViews(),
    [embeddable]
  );

  useMount(() => {
    Promise.all([
      (embeddable as IEmbeddable & FilterableEmbeddable).getFilters(),
      (embeddable as IEmbeddable & FilterableEmbeddable).getQuery(),
    ]).then(([embeddableFilters, embeddableQuery]) => {
      setFilters(embeddableFilters);
      if (embeddableQuery) {
        if (isOfQueryType(embeddableQuery)) {
          setQueryString(embeddableQuery.query as string);
        } else {
          const language = getAggregateQueryMode(embeddableQuery);
          setQueryLanguage(language);
          setQueryString(embeddableQuery[language as keyof AggregateQuery]);
        }
      }
      setIsLoading(false);
    });
  });

  return (
    <>
      {isLoading ? (
        <EuiLoadingContent lines={3} />
      ) : (
        <EuiForm
          component="div"
          css={css`
            min-width: 300px;
          `}
        >
          {queryString !== '' && (
            <EuiFormRow
              label={dashboardFilterNotificationActionStrings.getQueryTitle()}
              display="rowCompressed"
            >
              <EuiCodeBlock
                language={queryLanguage}
                paddingSize="none"
                transparentBackground
                aria-labelledby={`${dashboardFilterNotificationActionStrings.getQueryTitle()}: ${queryString}`}
                tabIndex={0} // focus so that keyboard controls will not skip over the code block
              >
                {queryString}
              </EuiCodeBlock>
            </EuiFormRow>
          )}
          {filters && filters.length > 0 && (
            <EuiFormRow label={dashboardFilterNotificationActionStrings.getFiltersTitle()}>
              <EuiFlexGroup wrap={true} gutterSize="xs">
                <FilterItems filters={filters} indexPatterns={dataViews} readOnly={true} />
              </EuiFlexGroup>
            </EuiFormRow>
          )}
        </EuiForm>
      )}
    </>
  );
}
