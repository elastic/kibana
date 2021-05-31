/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment, useEffect, useRef, useMemo } from 'react';
import classNames from 'classnames';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import './context_app_legacy.scss';
import { EuiHorizontalRule, EuiText, EuiPageContent, EuiPage, EuiSpacer } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import {
  CONTEXT_DEFAULT_SIZE_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  DOC_TABLE_LEGACY,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../../../common';
import { ContextErrorMessage } from '../context_error_message';
import {
  DocTableLegacy,
  DocTableLegacyProps,
} from '../../angular/doc_table/create_doc_table_react';
import { IndexPattern } from '../../../../../data/common/index_patterns';
import { LoadingState, LoadingStatus, LoadingStatusEntry } from '../../angular/context_query_state';
import { ActionBar, ActionBarProps } from '../../angular/context/components/action_bar/action_bar';
import { DiscoverGrid, DiscoverGridProps } from '../discover_grid/discover_grid';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { getServices } from '../../../kibana_services';
import { AppState, isEqualFilters } from '../../angular/context_state';
import { useDataGridColumns } from '../../helpers/use_data_grid_columns';
import { EsHitRecord } from '../../angular/context/api/context';
import { useContextAppState } from './use_context_app_state';
import { useContextAppActions } from './use_context_app_actions';

export interface ContextAppProps {
  indexPattern: IndexPattern;
  indexPatternId: string;
  anchorId: string;
}

const DataGridMemoized = React.memo(DiscoverGrid);
const PREDECESSOR_TYPE = 'predecessors';
const SUCCESSOR_TYPE = 'successors';

function isLoading(status: LoadingState) {
  return status !== LoadingStatus.LOADED && status !== LoadingStatus.FAILED;
}

export function ContextAppLegacy(renderProps: ContextAppProps) {
  const services = getServices();
  const { uiSettings: config, capabilities, indexPatterns, navigation } = services;
  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);
  const defaultStepSize = useMemo(() => parseInt(config.get(CONTEXT_DEFAULT_SIZE_SETTING), 10), [
    config,
  ]);
  const { indexPattern, indexPatternId, anchorId } = renderProps;
  const [expandedDoc, setExpandedDoc] = useState<EsHitRecord | undefined>(undefined);
  const isLegacy = config.get(DOC_TABLE_LEGACY);

  const { state, setAppState } = useContextAppState({
    indexPattern,
    defaultStepSize,
    services,
  });
  const prevState = useRef<AppState>();

  const isAnchorLoaded = state.anchorStatus === LoadingStatus.LOADED;
  const isFailed = state.anchorStatus === LoadingStatus.FAILED;
  const allRowsLoaded =
    state.anchorStatus === LoadingStatus.LOADED &&
    state.predecessorsStatus === LoadingStatus.LOADED &&
    state.successorsStatus === LoadingStatus.LOADED;

  const { fetchSurroundingRows, fetchContextRows, fetchAllRows, addFilter } = useContextAppActions({
    anchorId,
    indexPatternId,
    state,
    useNewFieldsApi,
    services,
    setAppState,
  });

  /**
   * Fetch docs on ui changes
   */
  useEffect(() => {
    if (!prevState.current) {
      fetchAllRows();
    } else if (prevState.current.predecessorCount !== state.predecessorCount) {
      fetchSurroundingRows('predecessors');
    } else if (prevState.current.successorCount !== state.successorCount) {
      fetchSurroundingRows('successors');
    } else if (!isEqualFilters(prevState.current.filters, state.filters)) {
      fetchContextRows(state.anchor);
    }

    prevState.current = cloneDeep(state);
  }, [state, indexPatternId, anchorId, fetchContextRows, fetchAllRows, fetchSurroundingRows]);

  const { columns, onAddColumn, onRemoveColumn, onSetColumns } = useDataGridColumns({
    capabilities,
    config,
    indexPattern,
    indexPatterns,
    setAppState,
    state,
    useNewFieldsApi: !!useNewFieldsApi,
  });
  const rows = [
    ...(state.predecessors || []),
    ...(state.anchor ? [state.anchor] : []),
    ...(state.successors || []),
  ];

  const actionBarProps = (type: string) => {
    const isPredecessorType = type === PREDECESSOR_TYPE;
    return {
      defaultStepSize,
      docCount: isPredecessorType ? state.predecessorCount : state.successorCount,
      docCountAvailable: isPredecessorType ? state.predecessors.length : state.successors.length,
      onChangeCount: (count) => {
        const countKey = type === PREDECESSOR_TYPE ? 'predecessorCount' : 'successorCount';
        setAppState({ [countKey]: count });
      },
      isLoading: isPredecessorType
        ? isLoading(state.predecessorsStatus)
        : isLoading(state.successorsStatus),
      type,
      isDisabled: !isAnchorLoaded,
    } as ActionBarProps;
  };

  const docTableProps = () => {
    return {
      ariaLabelledBy: 'surDocumentsAriaLabel',
      columns,
      rows: rows as ElasticSearchHit[],
      indexPattern,
      expandedDoc,
      isLoading: !allRowsLoaded,
      sampleSize: 0,
      sort: state.sort,
      isSortEnabled: false,
      showTimeCol: !config.get(DOC_HIDE_TIME_COLUMN_SETTING, false) && !!indexPattern.timeFieldName,
      services,
      useNewFieldsApi,
      isPaginationEnabled: false,
      setExpandedDoc,
      onFilter: addFilter,
      onAddColumn,
      onRemoveColumn,
      onSetColumns,
    } as DiscoverGridProps;
  };

  const legacyDocTableProps = () => {
    // @ts-expect-error doesn't implement full DocTableLegacyProps interface
    return {
      columns,
      indexPattern,
      minimumVisibleRows: rows.length,
      rows,
      onFilter: addFilter,
      onAddColumn,
      onRemoveColumn,
      sort: state.sort.map((el) => [el]),
      useNewFieldsApi,
    } as DocTableLegacyProps;
  };

  const TopNavMenu = navigation.ui.TopNavMenu;
  const getNavBarProps = () => {
    return {
      appName: 'context',
      showSearchBar: true,
      showQueryBar: false,
      showFilterBar: true,
      showSaveQuery: false,
      showDatePicker: false,
      indexPatterns: [renderProps.indexPattern],
      useDefaultBehaviors: true,
    };
  };

  const loadingFeedback = () => {
    if (
      state.anchorStatus === LoadingStatus.UNINITIALIZED ||
      state.anchorStatus === LoadingStatus.LOADING
    ) {
      return (
        <EuiText textAlign="center" data-test-subj="contextApp_loadingIndicator">
          <FormattedMessage id="discover.context.loadingDescription" defaultMessage="Loading..." />
        </EuiText>
      );
    }
    return null;
  };

  return (
    <I18nProvider>
      {isFailed ? (
        <ContextErrorMessage
          status={state.anchorStatus as string}
          reason={(state.anchorStatus as LoadingStatusEntry).reason}
        />
      ) : (
        <Fragment>
          <TopNavMenu {...getNavBarProps()} />
          <EuiPage className={classNames({ dscDocsPage: !isLegacy })}>
            <EuiPageContent paddingSize="s" className="dscDocsContent">
              <EuiSpacer size="s" />
              <EuiText>
                <strong>
                  <FormattedMessage
                    id="discover.context.contextOfTitle"
                    defaultMessage="Context of #{anchorId}"
                    values={{ anchorId }}
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="s" />
              <ActionBar {...actionBarProps(PREDECESSOR_TYPE)} />
              {loadingFeedback()}
              <EuiHorizontalRule margin="xs" />
              {isLegacy ? (
                isAnchorLoaded && (
                  <div className="discover-table">
                    <DocTableLegacy {...legacyDocTableProps()} />
                  </div>
                )
              ) : (
                <div className="dscDocsGrid">
                  <DataGridMemoized {...docTableProps()} />
                </div>
              )}
              <EuiHorizontalRule margin="xs" />
              <ActionBar {...actionBarProps(SUCCESSOR_TYPE)} />
            </EuiPageContent>
          </EuiPage>
        </Fragment>
      )}
    </I18nProvider>
  );
}
