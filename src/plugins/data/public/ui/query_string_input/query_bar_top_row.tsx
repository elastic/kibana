/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@elastic/datemath';
import classNames from 'classnames';
import React, { useState, ReactNode } from 'react';
import { buildEmptyFilter, Filter } from '@kbn/es-query';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiFieldText,
  prettyDuration,
  EuiIconProps,
  EuiButtonIcon,
  EuiPopover,
} from '@elastic/eui';
// @ts-ignore
import { EuiSuperUpdateButton, OnRefreshProps } from '@elastic/eui';
import { IDataPluginServices, IIndexPattern, TimeRange, TimeHistoryContract, Query } from '../..';
import { useKibana, withKibana } from '../../../../kibana_react/public';
import QueryStringInputUI from './query_string_input';
import { UI_SETTINGS } from '../../../common';
import { getQueryLog } from '../../query';
import type { PersistedLog } from '../../query';
import { NoDataPopover } from './no_data_popover';
import { SavedQuery } from '../..';
// import { FilterEditor } from '../filter_bar/filter_editor';
// import { FILTER_EDITOR_WIDTH } from '../filter_bar/filter_item';
import { AddFilterModal } from './add_filter_modal';

const QueryStringInput = withKibana(QueryStringInputUI);

// @internal
export interface QueryBarTopRowProps {
  query?: Query;
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  onSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  applySelectedSavedQueries?: () => void;
  customSubmitButton?: any;
  dataTestSubj?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  disableAutoFocus?: boolean;
  screenTitle?: string;
  fillSubmitButton?: boolean;
  iconType?: EuiIconProps['type'];
  indexPatterns?: Array<IIndexPattern | string>;
  indicateNoData?: boolean;
  isClearable?: boolean;
  isDirty: boolean;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  nonKqlMode?: 'lucene' | 'text';
  nonKqlModeHelpText?: string;
  onChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
  onSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  placeholder?: string;
  prepend?: React.ComponentProps<typeof EuiFieldText>['prepend'];
  query?: Query;
  refreshInterval?: number;
  screenTitle?: string;
  showQueryInput?: boolean;
  showDatePicker?: boolean;
  showAutoRefreshOnly?: boolean;
  timeHistory?: TimeHistoryContract;
  timeRangeForSuggestionsOverride?: boolean;
  savedQueryManagement?: JSX.Element;
  toggleAddFilterModal?: (value: boolean) => void;
  isAddFilterModalOpen?: boolean;
  addFilterMode?: string;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function QueryBarTopRow(props: QueryBarTopRowProps) {
  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
  const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);
  // const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);

  const kibana = useKibana<IDataPluginServices>();
  const { uiSettings, storage, appName } = kibana.services;

  const queryLanguage = props.query && props.query.language;
  const persistedLog: PersistedLog | undefined = React.useMemo(
    () =>
      queryLanguage && uiSettings && storage && appName
        ? getQueryLog(uiSettings!, storage, appName, queryLanguage)
        : undefined,
    [appName, queryLanguage, uiSettings, storage]
  );

  function onClickSubmitButton(event: React.MouseEvent<HTMLButtonElement>) {
    if (persistedLog && props.query) {
      persistedLog.add(props.query.query);
    }
    event.preventDefault();
    onSubmit({ query: props.query, dateRange: getDateRange() });
  }

  function getDateRange() {
    const defaultTimeSetting = uiSettings!.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
    return {
      from: props.dateRangeFrom || defaultTimeSetting.from,
      to: props.dateRangeTo || defaultTimeSetting.to,
    };
  }

  function onQueryChange(query: Query) {
    props.onChange({
      query,
      dateRange: getDateRange(),
    });
  }

  function onChangeQueryInputFocus(isFocused: boolean) {
    setIsQueryInputFocused(isFocused);
  }

  // const onAddFilterClick = () => setIsAddFilterPopoverOpen(!isAddFilterPopoverOpen);
  const onAddFilterClick = () => props.toggleAddFilterModal?.(!props.isAddFilterModalOpen);
  function onAdd(filter: Filter) {
    props.toggleAddFilterModal?.(false);

    const filters = [...props.filters, filter];
    props?.onFiltersUpdated?.(filters);
  }

  function onAddMultipleFilters(selectedFilters: Filter[]) {
    props.toggleAddFilterModal?.(false);

    const filters = [...props.filters, ...selectedFilters];
    props?.onFiltersUpdated?.(filters);
  }

  function applySavedQueries() {
    props.toggleAddFilterModal?.(false);
    props?.applySelectedSavedQueries?.();
  }

  function onTimeChange({
    start,
    end,
    isInvalid,
    isQuickSelection,
  }: {
    start: string;
    end: string;
    isInvalid: boolean;
    isQuickSelection: boolean;
  }) {
    setIsDateRangeInvalid(isInvalid);
    const retVal = {
      query: props.query,
      dateRange: {
        from: start,
        to: end,
      },
    };

    if (isQuickSelection) {
      props.onSubmit(retVal);
    } else {
      props.onChange(retVal);
    }
  }

  function onRefresh({ start, end }: OnRefreshProps) {
    const retVal = {
      dateRange: {
        from: start,
        to: end,
      },
    };
    if (props.onRefresh) {
      props.onRefresh(retVal);
    }
  }

  function onSubmit({ query, dateRange }: { query?: Query; dateRange: TimeRange }) {
    if (props.timeHistory) {
      props.timeHistory.add(dateRange);
    }

    props.onSubmit({ query, dateRange });
  }

  function onInputSubmit(query: Query) {
    onSubmit({
      query,
      dateRange: getDateRange(),
    });
  }

  function toAbsoluteString(value: string, roundUp = false) {
    const valueAsMoment = dateMath.parse(value, { roundUp });
    if (!valueAsMoment) {
      return value;
    }
    return valueAsMoment.toISOString();
  }

  function renderQueryInput() {
    if (!shouldRenderQueryInput()) return;

    return (
      <EuiFlexItem>
        <QueryStringInput
          disableAutoFocus={props.disableAutoFocus}
          indexPatterns={props.indexPatterns!}
          prepend={props.prepend}
          query={props.query!}
          screenTitle={props.screenTitle}
          onChange={onQueryChange}
          onChangeQueryInputFocus={onChangeQueryInputFocus}
          onSubmit={onInputSubmit}
          persistedLog={persistedLog}
          dataTestSubj={props.dataTestSubj}
          placeholder={props.placeholder}
          isClearable={props.isClearable}
          iconType={props.iconType}
          nonKqlMode={props.nonKqlMode}
          nonKqlModeHelpText={props.nonKqlModeHelpText}
          timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
        />
      </EuiFlexItem>
    );
  }

  function renderAddFilter() {
    const isPinned = uiSettings!.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT);
    const [indexPattern] = props?.indexPatterns || [];
    const index = indexPattern && indexPattern.id;
    const newFilter = buildEmptyFilter(isPinned, index);

    const button = (
      <EuiButtonIcon
        display="fill"
        iconType="plusInCircleFilled"
        aria-label="Add filter"
        data-test-subj="addFilter"
        onClick={onAddFilterClick}
        size="m"
        color="text"
      />
    );

    return (
      <EuiFlexItem grow={false}>
        {button}
        {props.isAddFilterModalOpen && (
          <AddFilterModal
            onCancel={() => props.toggleAddFilterModal?.(false)}
            filter={newFilter}
            indexPatterns={props.indexPatterns!}
            onSubmit={onAddMultipleFilters}
            applySavedQueries={applySavedQueries}
            timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
            savedQueryManagement={props.savedQueryManagement}
            initialAddFilterMode={props.addFilterMode}
          />
        )}
        {/* <EuiPopover
          id="addFilterPopover"
          button={button}
          isOpen={isAddFilterPopoverOpen}
          closePopover={() => setIsAddFilterPopoverOpen(false)}
          anchorPosition="downLeft"
          panelPaddingSize="none"
          initialFocus=".filterEditor__hiddenItem"
          ownFocus
          repositionOnScroll
        >
          <EuiFlexItem grow={false}>
            <div style={{ width: FILTER_EDITOR_WIDTH, maxWidth: '100%' }}>
              <FilterEditor
                filter={newFilter}
                indexPatterns={props.indexPatterns!}
                onSubmit={onAdd}
                onCancel={() => setIsAddFilterPopoverOpen(false)}
                key={JSON.stringify(newFilter)}
                timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
              />
            </div>
          </EuiFlexItem>
        </EuiPopover> */}
      </EuiFlexItem>
    );
  }

  function renderSharingMetaFields() {
    const { from, to } = getDateRange();
    const dateRangePretty = prettyDuration(
      toAbsoluteString(from),
      toAbsoluteString(to),
      [],
      uiSettings.get('dateFormat')
    );
    return (
      <div
        data-shared-timefilter-duration={dateRangePretty}
        data-test-subj="dataSharedTimefilterDuration"
      />
    );
  }

  function shouldRenderDatePicker(): boolean {
    return Boolean(props.showDatePicker || props.showAutoRefreshOnly);
  }

  function shouldRenderQueryInput(): boolean {
    return Boolean(props.showQueryInput && props.indexPatterns && props.query && storage);
  }

  function renderUpdateButton() {
    const button = props.customSubmitButton ? (
      React.cloneElement(props.customSubmitButton, { onClick: onClickSubmitButton })
    ) : (
      // <EuiSuperUpdateButton
      //   needsUpdate={props.isDirty}
      //   isDisabled={isDateRangeInvalid}
      //   isLoading={props.isLoading}
      //   onClick={onClickSubmitButton}
      //   fill={props.fillSubmitButton}
      //   data-test-subj="querySubmitButton"
      // />
      <EuiButtonIcon
        display="fill"
        isDisabled={isDateRangeInvalid}
        iconType={props.isDirty ? 'push' : 'refresh'}
        aria-label="Update"
        data-test-subj="querySubmitButton"
        onClick={onClickSubmitButton}
        size="m"
        color={props.isDirty ? 'success' : 'primary'}
      />
    );

    if (!shouldRenderDatePicker()) {
      return button;
    }

    return (
      <NoDataPopover storage={storage} showNoDataPopover={props.indicateNoData}>
        <EuiFlexGroup responsive={false} gutterSize="s">
          {renderDatePicker()}
          <EuiFlexItem grow={false}>{button}</EuiFlexItem>
        </EuiFlexGroup>
      </NoDataPopover>
    );
  }

  function renderDatePicker() {
    if (!shouldRenderDatePicker()) {
      return null;
    }

    let recentlyUsedRanges;
    if (props.timeHistory) {
      recentlyUsedRanges = props.timeHistory
        .get()
        .map(({ from, to }: { from: string; to: string }) => {
          return {
            start: from,
            end: to,
          };
        });
    }

    const commonlyUsedRanges = uiSettings!
      .get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
      .map(({ from, to, display }: { from: string; to: string; display: string }) => {
        return {
          start: from,
          end: to,
          label: display,
        };
      });

    const wrapperClasses = classNames('kbnQueryBar__datePickerWrapper', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'kbnQueryBar__datePickerWrapper-isHidden': isQueryInputFocused,
    });

    return (
      <EuiFlexItem className={wrapperClasses}>
        <EuiSuperDatePicker
          start={props.dateRangeFrom}
          end={props.dateRangeTo}
          isPaused={props.isRefreshPaused}
          refreshInterval={props.refreshInterval}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          onRefreshChange={props.onRefreshChange}
          showUpdateButton={false}
          recentlyUsedRanges={recentlyUsedRanges}
          commonlyUsedRanges={commonlyUsedRanges}
          dateFormat={uiSettings!.get('dateFormat')}
          isAutoRefreshOnly={props.showAutoRefreshOnly}
          className="kbnQueryBar__datePicker"
        />
      </EuiFlexItem>
    );
  }

  const classes = classNames('kbnQueryBar', {
    'kbnQueryBar--withDatePicker': props.showDatePicker,
  });

  return (
    <EuiFlexGroup
      className={classes}
      responsive={!!props.showDatePicker}
      gutterSize="s"
      justifyContent="flexEnd"
    >
      {renderQueryInput()}
      {renderAddFilter()}
      {renderSharingMetaFields()}
      <EuiFlexItem grow={false}>{renderUpdateButton()}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

QueryBarTopRow.defaultProps = {
  showQueryInput: true,
  showDatePicker: true,
  showAutoRefreshOnly: false,
};
