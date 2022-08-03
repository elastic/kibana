/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
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
import { FiltersNotificationActionContext } from './filters_notification_badge';
import { dashboardFilterNotificationBadge } from '../../dashboard_strings';
import { DashboardContainer } from '../embeddable';
import { getAggregateQueryMode, isOfQueryType } from '@kbn/es-query';

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

  const filters = (embeddable as IEmbeddable & FilterableEmbeddable).getFilters();
  const dataViewList: DataView[] = (embeddable.getRoot() as DashboardContainer)?.getAllDataViews();
  const viewMode = embeddable.getInput()?.viewMode;

  let language: string | undefined;
  const getQueryString = () => {
    const query = (embeddable as IEmbeddable & FilterableEmbeddable).getQuery();
    if (query) {
      if (isOfQueryType(query)) return query.query;

      language = getAggregateQueryMode(query);
      if ('sql' in query) return query.sql;
      if ('esql' in query) return query.esql;
    }
    return '';
  };

  const queryString = getQueryString();

  return (
    <>
      <EuiModalHeader id="filtersNotificationModal__header">
        <EuiModalHeaderTitle>
          <h2 id={`title-${id}`}>{displayName}</h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody id="filtersNotificationModal__body">
        <EuiForm component="div">
          {queryString !== '' && (
            <EuiFormRow
              label="Query"
              display="rowCompressed"
              css={css`
                max-width: 100%;
              `}
            >
              <EuiCodeBlock
                language={language}
                paddingSize="none"
                transparentBackground
                aria-labelledby={`Query: ${queryString}`}
                tabIndex={0} // focus so that keyboard controls will not skip over the code block
              >
                {queryString}
              </EuiCodeBlock>
            </EuiFormRow>
          )}
          {filters.length > 0 && (
            <EuiFormRow
              label="Filters"
              // the following makes it so that the filter pills respect the inner padding of the modal body
              // regardless of what the gutter size is
              css={css`
                max-width: 100%;
              `}
            >
              <EuiFlexGroup wrap={true} gutterSize="xs">
                <FilterItems filters={filters} indexPatterns={dataViewList} readOnly={true} />
              </EuiFlexGroup>
            </EuiFormRow>
          )}
        </EuiForm>
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
