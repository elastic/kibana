/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@elastic/datemath';
import classNames from 'classnames';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import useObservable from 'react-use/lib/useObservable';
import type { Filter } from '@kbn/es-query';
import { EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiFieldText,
  prettyDuration,
  EuiIconProps,
  EuiButtonIcon,
  OnRefreshProps,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { IDataPluginServices, IIndexPattern, TimeRange, TimeHistoryContract, Query } from '../..';
import { useKibana, withKibana } from '../../../../kibana_react/public';
import QueryStringInputUI from './query_string_input';
import { UI_SETTINGS } from '../../../common';
import { getQueryLog } from '../../query';
import type { PersistedLog } from '../../query';
import { NoDataPopover } from './no_data_popover';
import { shallowEqual } from '../../utils/shallow_equal';
import { AddFilterPopover } from './add_filter';
import { DataViewPicker, DataViewPickerProps } from '../dataview_picker';

const SuperDatePicker = React.memo(
  EuiSuperDatePicker as any
) as unknown as typeof EuiSuperDatePicker;
const SuperUpdateButton = React.memo(EuiButtonIcon);

const QueryStringInput = withKibana(QueryStringInputUI);

// @internal
export interface QueryBarTopRowProps {
  customSubmitButton?: any;
  dataTestSubj?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  disableAutoFocus?: boolean;
  fillSubmitButton: boolean;
  iconType?: EuiIconProps['type'];
  indexPatterns?: Array<IIndexPattern | string>;
  indicateNoData?: boolean;
  isClearable?: boolean;
  isDirty: boolean;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  nonKqlMode?: 'lucene' | 'text';
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
  showAddFilter?: boolean;
  showDatePicker?: boolean;
  showAutoRefreshOnly?: boolean;
  timeHistory?: TimeHistoryContract;
  timeRangeForSuggestionsOverride?: boolean;
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  dataViewPickerComponentProps?: DataViewPickerProps;
}

const SharingMetaFields = React.memo(function SharingMetaFields({
  from,
  to,
  dateFormat,
}: {
  from: string;
  to: string;
  dateFormat: string;
}) {
  function toAbsoluteString(value: string, roundUp = false) {
    const valueAsMoment = dateMath.parse(value, { roundUp });
    if (!valueAsMoment) {
      return value;
    }
    return valueAsMoment.toISOString();
  }

  const dateRangePretty = prettyDuration(
    toAbsoluteString(from),
    toAbsoluteString(to),
    [],
    dateFormat
  );

  return (
    <div
      data-shared-timefilter-duration={dateRangePretty}
      data-test-subj="dataSharedTimefilterDuration"
    />
  );
});

export const QueryBarTopRow = React.memo(
  function QueryBarTopRow(props: QueryBarTopRowProps) {
    const isMobile = useIsWithinBreakpoints(['xs', 's']);
    const { showQueryInput = true, showDatePicker = true, showAutoRefreshOnly = false } = props;

    const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
    const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);

    const kibana = useKibana<IDataPluginServices>();
    const { uiSettings, storage, appName } = kibana.services;

    const queryLanguage = props.query && props.query.language;
    const queryRef = useRef<Query | undefined>(props.query);
    queryRef.current = props.query;

    const persistedLog: PersistedLog | undefined = React.useMemo(
      () =>
        queryLanguage && uiSettings && storage && appName
          ? getQueryLog(uiSettings!, storage, appName, queryLanguage)
          : undefined,
      [appName, queryLanguage, uiSettings, storage]
    );

    function getDateRange() {
      const defaultTimeSetting = uiSettings!.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
      return {
        from: props.dateRangeFrom || defaultTimeSetting.from,
        to: props.dateRangeTo || defaultTimeSetting.to,
      };
    }

    const currentDateRange = getDateRange();
    const dateRangeRef = useRef<{ from: string; to: string }>(currentDateRange);
    dateRangeRef.current = currentDateRange;

    const propsOnSubmit = props.onSubmit;

    const toRecentlyUsedRanges = (ranges: TimeRange[]) =>
      ranges.map(({ from, to }: { from: string; to: string }) => {
        return {
          start: from,
          end: to,
        };
      });
    const timeHistory = props.timeHistory;
    const timeHistory$ = useMemo(
      () => timeHistory?.get$().pipe(map(toRecentlyUsedRanges)) ?? EMPTY,
      [timeHistory]
    );

    const recentlyUsedRanges = useObservable(
      timeHistory$,
      toRecentlyUsedRanges(timeHistory?.get() ?? [])
    );
    const [commonlyUsedRanges] = useState(() => {
      return (
        uiSettings
          ?.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
          ?.map(({ from, to, display }: { from: string; to: string; display: string }) => {
            return {
              start: from,
              end: to,
              label: display,
            };
          }) ?? []
      );
    });

    const onSubmit = useCallback(
      ({ query, dateRange }: { query?: Query; dateRange: TimeRange }) => {
        if (timeHistory) {
          timeHistory.add(dateRange);
        }

        propsOnSubmit({ query, dateRange });
      },
      [timeHistory, propsOnSubmit]
    );

    const onClickSubmitButton = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (persistedLog && queryRef.current) {
          persistedLog.add(queryRef.current.query);
        }
        event.preventDefault();
        onSubmit({
          query: queryRef.current,
          dateRange: dateRangeRef.current,
        });
      },
      [persistedLog, onSubmit]
    );

    const propsOnChange = props.onChange;
    const onQueryChange = useCallback(
      (query: Query) => {
        return propsOnChange({
          query,
          dateRange: dateRangeRef.current,
        });
      },
      [propsOnChange]
    );

    const onChangeQueryInputFocus = useCallback((isFocused: boolean) => {
      setIsQueryInputFocused(isFocused);
    }, []);

    const onTimeChange = useCallback(
      ({
        start,
        end,
        isInvalid,
        isQuickSelection,
      }: {
        start: string;
        end: string;
        isInvalid: boolean;
        isQuickSelection: boolean;
      }) => {
        setIsDateRangeInvalid(isInvalid);
        const retVal = {
          query: queryRef.current,
          dateRange: {
            from: start,
            to: end,
          },
        };

        if (isQuickSelection) {
          onSubmit(retVal);
        } else {
          propsOnChange(retVal);
        }
      },
      [propsOnChange, onSubmit]
    );

    const propsOnRefresh = props.onRefresh;
    const onRefresh = useCallback(
      ({ start, end }: OnRefreshProps) => {
        const retVal = {
          dateRange: {
            from: start,
            to: end,
          },
        };
        if (propsOnRefresh) {
          propsOnRefresh(retVal);
        }
      },
      [propsOnRefresh]
    );

    const onInputSubmit = useCallback(
      (query: Query) => {
        onSubmit({
          query,
          dateRange: dateRangeRef.current,
        });
      },
      [onSubmit]
    );

    function shouldRenderQueryInput(): boolean {
      return Boolean(showQueryInput && props.indexPatterns && props.query && storage);
    }

    function shouldRenderDatePicker(): boolean {
      return Boolean(showDatePicker || showAutoRefreshOnly);
    }

    function shouldRenderUpdatebutton(): boolean {
      return Boolean(showQueryInput || showDatePicker || showAutoRefreshOnly);
    }

    function renderDatePicker() {
      if (!shouldRenderDatePicker()) {
        return null;
      }

      const wrapperClasses = classNames('kbnQueryBar__datePickerWrapper');

      return (
        <EuiFlexItem className={wrapperClasses}>
          <SuperDatePicker
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
            dateFormat={uiSettings.get('dateFormat')}
            isAutoRefreshOnly={showAutoRefreshOnly}
            className="kbnQueryBar__datePicker"
            isQuickSelectOnly={isMobile ? false : isQueryInputFocused}
            width={isMobile ? 'full' : 'auto'}
          />
        </EuiFlexItem>
      );
    }

    function renderUpdateButton() {
      if (!shouldRenderUpdatebutton()) {
        return null;
      }
      const button = props.customSubmitButton ? (
        React.cloneElement(props.customSubmitButton, { onClick: onClickSubmitButton })
      ) : (
        <SuperUpdateButton
          display="base"
          iconType={props.isDirty ? 'kqlFunction' : 'refresh'}
          aria-label={props.isDirty ? 'Update query' : 'Refresh query'}
          isDisabled={isDateRangeInvalid}
          onClick={onClickSubmitButton}
          size="m"
          color={props.isDirty ? 'success' : 'primary'}
          data-test-subj="querySubmitButton"
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

    function renderDataViewsPicker() {
      if (!props.dataViewPickerComponentProps) return;

      return (
        <EuiFlexItem grow={false}>
          <DataViewPicker showNewMenuTour {...props.dataViewPickerComponentProps} />
        </EuiFlexItem>
      );
    }

    function renderQueryInput() {
      return (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>{props.prepend}</EuiFlexItem>
          {shouldRenderQueryInput() && (
            <EuiFlexItem>
              <QueryStringInput
                disableAutoFocus={props.disableAutoFocus}
                indexPatterns={props.indexPatterns!}
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
                timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
                disableLanguageSwitcher={true}
              />
            </EuiFlexItem>
          )}
          {Boolean(props.showAddFilter) && (
            <EuiFlexItem grow={false}>
              <AddFilterPopover
                indexPatterns={props.indexPatterns}
                filters={props.filters}
                timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
                onFiltersUpdated={props.onFiltersUpdated}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }

    const classes = classNames('kbnQueryBar', {
      'kbnQueryBar--withDatePicker': showDatePicker && !props.dataViewPickerComponentProps,
      'kbnQueryBar-withDataViewPicker': showDatePicker && props.dataViewPickerComponentProps,
    });

    return (
      <EuiFlexGroup
        className={classes}
        direction={isMobile ? 'columnReverse' : 'row'}
        responsive={false}
        gutterSize="s"
      >
        {renderDataViewsPicker()}
        <EuiFlexItem style={{ minWidth: '50%' }}>{renderQueryInput()}</EuiFlexItem>
        <SharingMetaFields
          from={currentDateRange.from}
          to={currentDateRange.to}
          dateFormat={uiSettings.get('dateFormat')}
        />
        <EuiFlexItem grow={false}>{renderUpdateButton()}</EuiFlexItem>
      </EuiFlexGroup>
    );
  },
  ({ query: prevQuery, ...prevProps }, { query: nextQuery, ...nextProps }) => {
    let isQueryEqual = true;
    if (prevQuery !== nextQuery) {
      if (!deepEqual(prevQuery, nextQuery)) {
        isQueryEqual = false;
      }
    }

    return isQueryEqual && shallowEqual(prevProps, nextProps);
  }
);

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default QueryBarTopRow;
