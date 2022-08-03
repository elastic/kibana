/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingContent,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { css } from '@emotion/react';
import {
  EditPanelAction,
  FilterableEmbeddable,
  IEmbeddable,
  ViewMode,
} from '@kbn/embeddable-plugin/public';
import { AggregateQuery, Filter, getAggregateQueryMode, isOfQueryType } from '@kbn/es-query';
import { FiltersNotificationActionContext } from './filters_notification_badge';
import { dashboardFilterNotificationBadge } from '../../dashboard_strings';
import { DashboardContainer } from '../embeddable';

export interface FiltersNotificationProps {
  context: FiltersNotificationActionContext;
  displayName: string;
  id: string;
  editPanelAction: EditPanelAction;
  onClose: () => void;
}

export function FiltersNotificationModal({
  context,
  displayName,
  id,
  editPanelAction,
  onClose,
}: FiltersNotificationProps) {
  const { embeddable } = context;
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [queryString, setQueryString] = useState<string>('');
  const [queryLanguage, setQueryLanguage] = useState<'sql' | 'esql' | undefined>();

  useEffect(() => {
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
  }, [embeddable]);

  const dataViewList: DataView[] = (embeddable.getRoot() as DashboardContainer)?.getAllDataViews();
  const viewMode = embeddable.getInput().viewMode;

  return (
    <>
      <EuiModalHeader id="filtersNotificationModal__header">
        <EuiModalHeaderTitle>
          <h2 id={`title-${id}`}>{displayName}</h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody id="filtersNotificationModal__body">
        {isLoading ? (
          <EuiLoadingContent lines={3} />
        ) : (
          <EuiForm component="div">
            {queryString !== '' && (
              <EuiFormRow
                label={dashboardFilterNotificationBadge.getQueryTitle()}
                display="rowCompressed"
              >
                <EuiCodeBlock
                  language={queryLanguage}
                  paddingSize="none"
                  transparentBackground
                  aria-labelledby={`${dashboardFilterNotificationBadge.getQueryTitle()}: ${queryString}`}
                  tabIndex={0} // focus so that keyboard controls will not skip over the code block
                >
                  {queryString}
                </EuiCodeBlock>
              </EuiFormRow>
            )}
            {filters && filters.length > 0 && (
              <EuiFormRow
                label={dashboardFilterNotificationBadge.getFiltersTitle()}
                css={css`
                  max-width: fit-content;
                `}
              >
                <EuiFlexGroup wrap={true} gutterSize="xs">
                  <FilterItems filters={filters} indexPatterns={dataViewList} readOnly={true} />
                </EuiFlexGroup>
              </EuiFormRow>
            )}
          </EuiForm>
        )}
      </EuiModalBody>

      {viewMode !== ViewMode.VIEW && (
        <EuiModalFooter id="filtersNotificationModal__footer">
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onClose}
                data-test-subj="filtersNotificationModal__closeButton"
              >
                {dashboardFilterNotificationBadge.getCloseButtonTitle()}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="filtersNotificationModal__editButton"
                onClick={() => {
                  onClose();
                  editPanelAction.execute(context);
                }}
                fill
              >
                {dashboardFilterNotificationBadge.getEditButtonTitle()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      )}
    </>
  );
}
