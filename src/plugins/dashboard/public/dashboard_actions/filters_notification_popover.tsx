/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { AggregateQuery, getAggregateQueryMode, isOfQueryType } from '@kbn/es-query';
import { getEditPanelAction } from '@kbn/presentation-panel-plugin/public';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import {
  apiCanLockHoverActions,
  getViewModeSubject,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';
import { FiltersNotificationActionApi } from './filters_notification_action';

export function FiltersNotificationPopover({ api }: { api: FiltersNotificationActionApi }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [disableEditbutton, setDisableEditButton] = useState(false);

  const editPanelAction = getEditPanelAction();

  const filters = useMemo(() => api.filters$?.value, [api]);
  const displayName = dashboardFilterNotificationActionStrings.getDisplayName();

  const { queryString, queryLanguage } = useMemo(() => {
    const query = api.query$?.value;
    if (!query) return {};
    if (isOfQueryType(query)) {
      if (typeof query.query === 'string') {
        return { queryString: query.query };
      } else {
        return { queryString: JSON.stringify(query.query, null, 2) };
      }
    } else {
      setDisableEditButton(true);
      const language: 'esql' | undefined = getAggregateQueryMode(query);
      return {
        queryString: query[language as keyof AggregateQuery],
        queryLanguage: language,
      };
    }
  }, [api, setDisableEditButton]);

  const [dataViews, parentViewMode] = useBatchedOptionalPublishingSubjects(
    api.parentApi?.dataViews,
    getViewModeSubject(api ?? undefined)
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="text"
          iconType={'filter'}
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
            if (apiCanLockHoverActions(api)) {
              api?.lockHoverActions(!api.hasLockedHoverActions$.value);
            }
          }}
          data-test-subj={`embeddablePanelNotification-${api.uuid}`}
          aria-label={displayName}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        if (apiCanLockHoverActions(api)) {
          api.lockHoverActions(false);
        }
      }}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>{displayName}</EuiPopoverTitle>
      <EuiForm
        component="div"
        css={css`
          min-width: 300px;
        `}
      >
        {Boolean(queryString) && (
          <EuiFormRow
            label={dashboardFilterNotificationActionStrings.getQueryTitle()}
            data-test-subj={'filtersNotificationModal__query'}
            display="rowCompressed"
          >
            <EuiCodeBlock
              language={queryLanguage}
              paddingSize="s"
              aria-labelledby={`${dashboardFilterNotificationActionStrings.getQueryTitle()}: ${queryString}`}
              tabIndex={0} // focus so that keyboard controls will not skip over the code block
            >
              {queryString}
            </EuiCodeBlock>
          </EuiFormRow>
        )}
        {filters && filters.length > 0 && (
          <EuiFormRow
            label={dashboardFilterNotificationActionStrings.getFiltersTitle()}
            data-test-subj={'filtersNotificationModal__filterItems'}
          >
            <EuiFlexGroup wrap={true} gutterSize="xs">
              <FilterItems filters={filters} indexPatterns={dataViews ?? []} readOnly={true} />
            </EuiFlexGroup>
          </EuiFormRow>
        )}
      </EuiForm>
      {!disableEditbutton && parentViewMode === 'edit' && (
        <EuiPopoverFooter>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            justifyContent="flexEnd"
            responsive={false}
            wrap={true}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj={'filtersNotificationModal__editButton'}
                size="s"
                fill
                onClick={() => editPanelAction.execute({ embeddable: api })}
              >
                {dashboardFilterNotificationActionStrings.getEditButtonTitle()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      )}
    </EuiPopover>
  );
}
