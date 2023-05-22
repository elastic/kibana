/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import useObservable from 'react-use/lib/useObservable';
import type { Filter, TimeRange, Query, AggregateQuery } from '@kbn/es-query';
import { getAggregateQueryMode, isOfQueryType, isOfAggregateQueryType } from '@kbn/es-query';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { throttle } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiFieldText,
  usePrettyDuration,
  EuiIconProps,
  OnRefreshProps,
  useIsWithinBreakpoints,
  EuiSuperUpdateButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeHistoryContract, getQueryLog } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { PersistedLog } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { IUnifiedSearchPluginServices } from '../types';
import QueryStringInputUI from './query_string_input';
import { NoDataPopover } from './no_data_popover';
import { shallowEqual } from '../utils/shallow_equal';
import { AddFilterPopover } from './add_filter_popover';
import {
  DataViewPicker,
  DataViewPickerProps,
  OnSaveTextLanguageQueryProps,
} from '../dataview_picker';

import { FilterButtonGroup } from '../filter_bar/filter_button_group/filter_button_group';
import type { SuggestionsListSize } from '../typeahead/suggestions_component';
import './query_bar.scss';

export const strings = {
  getNeedsUpdatingLabel: () =>
    i18n.translate('unifiedSearch.queryBarTopRow.submitButton.update', {
      defaultMessage: 'Needs updating',
    }),
  getRefreshQueryLabel: () =>
    i18n.translate('unifiedSearch.queryBarTopRow.submitButton.refresh', {
      defaultMessage: 'Refresh query',
    }),
  getRunQueryLabel: () =>
    i18n.translate('unifiedSearch.queryBarTopRow.submitButton.run', {
      defaultMessage: 'Run query',
    }),
};

const SuperDatePicker = React.memo(
  EuiSuperDatePicker as any
) as unknown as typeof EuiSuperDatePicker;

// @internal
export interface QueryBarTopRowProps<QT extends Query | AggregateQuery = Query> {
  customSubmitButton?: any;
  dataTestSubj?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  disableAutoFocus?: boolean;
  fillSubmitButton: boolean;
  iconType?: EuiIconProps['type'];
  indexPatterns?: Array<DataView | string>;
  indicateNoData?: boolean;
  isClearable?: boolean;
  isDirty: boolean;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  nonKqlMode?: 'lucene' | 'text';
  onChange: (payload: { dateRange: TimeRange; query?: Query | QT }) => void;
  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
  onSubmit: (payload: { dateRange: TimeRange; query?: Query | QT }) => void;
  placeholder?: string;
  prepend?: React.ComponentProps<typeof EuiFieldText>['prepend'];
  query?: Query | QT;
  refreshInterval?: number;
  screenTitle?: string;
  showQueryInput?: boolean;
  showAddFilter?: boolean;
  showDatePicker?: boolean;
  isDisabled?: boolean;
  showAutoRefreshOnly?: boolean;
  timeHistory?: TimeHistoryContract;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  dataViewPickerComponentProps?: DataViewPickerProps;
  textBasedLanguageModeErrors?: Error[];
  onTextBasedSavedAndExit?: ({ onSave }: OnSaveTextLanguageQueryProps) => void;
  filterBar?: React.ReactNode;
  showDatePickerAsBadge?: boolean;
  showSubmitButton?: boolean;
  /**
   * Style of the submit button
   * `iconOnly` - use IconButton
   * `full` - use SuperUpdateButton
   * (default) `auto` - `iconOnly` on smaller screens, and `full` on larger screens
   */
  submitButtonStyle?: 'auto' | 'iconOnly' | 'full';
  suggestionsSize?: SuggestionsListSize;
  isScreenshotMode?: boolean;
  onTextLangQuerySubmit: (query?: Query | AggregateQuery) => void;
  onTextLangQueryChange: (query: AggregateQuery) => void;
  submitOnBlur?: boolean;
}

export const SharingMetaFields = React.memo(function SharingMetaFields({
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

  try {
    const dateRangePretty = usePrettyDuration({
      timeFrom: toAbsoluteString(from),
      timeTo: toAbsoluteString(to),
      quickRanges: [],
      dateFormat,
    });
    return (
      <div
        data-shared-timefilter-duration={dateRangePretty}
        data-test-subj="dataSharedTimefilterDuration"
      />
    );
  } catch (e) {
    return <div data-test-subj="dataSharedTimefilterDuration" />;
  }
});

type GenericQueryBarTopRow = <QT extends AggregateQuery | Query = Query>(
  props: QueryBarTopRowProps<QT>
) => React.ReactElement;

export const QueryBarTopRow = React.memo(
  function QueryBarTopRow<QT extends Query | AggregateQuery = Query>(
    props: QueryBarTopRowProps<QT>
  ) {
    const isMobile = useIsWithinBreakpoints(['xs', 's']);
    const [isXXLarge, setIsXXLarge] = useState<boolean>(false);
    const [codeEditorIsExpanded, setCodeEditorIsExpanded] = useState<boolean>(false);
    const submitButtonStyle: QueryBarTopRowProps['submitButtonStyle'] =
      props.submitButtonStyle ?? 'auto';
    const submitButtonIconOnly =
      submitButtonStyle === 'auto' ? !isXXLarge : submitButtonStyle === 'iconOnly';

    useEffect(() => {
      if (submitButtonStyle !== 'auto') return;

      const handleResize = throttle(() => {
        setIsXXLarge(window.innerWidth >= 1440);
      }, 50);

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => window.removeEventListener('resize', handleResize);
    }, [submitButtonStyle]);

    const {
      showQueryInput = true,
      showDatePicker = true,
      showAutoRefreshOnly = false,
      showSubmitButton = true,
    } = props;

    const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
    const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);

    const kibana = useKibana<IUnifiedSearchPluginServices>();

    const {
      uiSettings,
      storage,
      appName,
      data,
      usageCollection,
      unifiedSearch,
      notifications,
      docLinks,
      http,
      dataViews,
    } = kibana.services;

    const isQueryLangSelected = props.query && !isOfQueryType(props.query);

    const queryLanguage = props.query && isOfQueryType(props.query) && props.query.language;
    const queryRef = useRef<Query | QT | undefined>(props.query);
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
      ({ query, dateRange }: { query?: Query | QT; dateRange: TimeRange }) => {
        if (timeHistory) {
          timeHistory.add(dateRange);
        }

        propsOnSubmit({ query, dateRange });
      },
      [timeHistory, propsOnSubmit]
    );

    const onClickSubmitButton = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (persistedLog && queryRef.current && isOfQueryType(queryRef.current)) {
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

    function renderFilterMenuOnly(): boolean {
      return !Boolean(props.showAddFilter) && Boolean(props.prepend);
    }

    function shouldRenderUpdatebutton(): boolean {
      return (
        Boolean(showSubmitButton) &&
        Boolean(showQueryInput || showDatePicker || showAutoRefreshOnly)
      );
    }

    function shouldShowDatePickerAsBadge(): boolean {
      return Boolean(props.showDatePickerAsBadge) && !shouldRenderQueryInput();
    }

    function renderDatePicker() {
      if (!shouldRenderDatePicker()) {
        return null;
      }

      const wrapperClasses = classNames('kbnQueryBar__datePickerWrapper');

      return (
        <EuiFlexItem className={wrapperClasses}>
          <SuperDatePicker
            isDisabled={props.isDisabled}
            start={props.dateRangeFrom}
            end={props.dateRangeTo}
            isPaused={props.isRefreshPaused}
            refreshInterval={props.refreshInterval}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
            onRefreshChange={props.onRefreshChange}
            showUpdateButton={false}
            recentlyUsedRanges={recentlyUsedRanges}
            locale={i18n.getLocale()}
            commonlyUsedRanges={commonlyUsedRanges}
            dateFormat={uiSettings.get('dateFormat')}
            isAutoRefreshOnly={showAutoRefreshOnly}
            className="kbnQueryBar__datePicker"
            isQuickSelectOnly={isMobile ? false : isQueryInputFocused}
            width={isMobile ? 'full' : 'auto'}
            compressed={shouldShowDatePickerAsBadge()}
          />
        </EuiFlexItem>
      );
    }

    function renderUpdateButton() {
      if (!shouldRenderUpdatebutton() && !shouldRenderDatePicker()) {
        return null;
      }
      const buttonLabelUpdate = strings.getNeedsUpdatingLabel();
      const buttonLabelRefresh = strings.getRefreshQueryLabel();
      const buttonLabelRun = strings.getRunQueryLabel();

      const iconDirty = Boolean(isQueryLangSelected) ? 'play' : 'kqlFunction';
      const tooltipDirty = Boolean(isQueryLangSelected) ? buttonLabelRun : buttonLabelUpdate;

      const button = props.customSubmitButton ? (
        React.cloneElement(props.customSubmitButton, { onClick: onClickSubmitButton })
      ) : (
        <EuiFlexItem grow={false}>
          <EuiSuperUpdateButton
            iconType={props.isDirty ? iconDirty : 'refresh'}
            iconOnly={submitButtonIconOnly}
            aria-label={props.isLoading ? buttonLabelUpdate : buttonLabelRefresh}
            isDisabled={isDateRangeInvalid || props.isDisabled}
            isLoading={props.isLoading}
            onClick={onClickSubmitButton}
            size={shouldShowDatePickerAsBadge() ? 's' : 'm'}
            color={props.isDirty ? 'success' : 'primary'}
            fill={props.isDirty}
            needsUpdate={props.isDirty}
            data-test-subj="querySubmitButton"
            // @ts-expect-error Need to fix expecting `children` in EUI
            toolTipProps={{
              content: props.isDirty ? tooltipDirty : buttonLabelRefresh,
              delay: 'long',
              position: 'bottom',
            }}
          />
        </EuiFlexItem>
      );

      // allows to render the button without the datepicker
      if (!shouldRenderDatePicker() && shouldRenderUpdatebutton()) {
        return button;
      }

      return (
        <EuiFlexItem grow={false}>
          <NoDataPopover storage={storage} showNoDataPopover={props.indicateNoData}>
            <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
              {shouldRenderDatePicker() ? renderDatePicker() : null}
              {shouldRenderUpdatebutton() ? button : null}
            </EuiFlexGroup>
          </NoDataPopover>
        </EuiFlexItem>
      );
    }

    function renderDataViewsPicker() {
      if (!props.dataViewPickerComponentProps) return;
      let textBasedLanguage;
      if (Boolean(isQueryLangSelected)) {
        const query = props.query as AggregateQuery;
        textBasedLanguage = getAggregateQueryMode(query);
      }
      return (
        <EuiFlexItem style={{ maxWidth: '100%' }} grow={isMobile}>
          <DataViewPicker
            {...props.dataViewPickerComponentProps}
            trigger={{ fullWidth: isMobile, ...props.dataViewPickerComponentProps.trigger }}
            onTextLangQuerySubmit={props.onTextLangQuerySubmit}
            textBasedLanguage={textBasedLanguage}
            onSaveTextLanguageQuery={props.onTextBasedSavedAndExit}
            isDisabled={props.isDisabled}
          />
        </EuiFlexItem>
      );
    }

    function renderAddButton() {
      return (
        Boolean(props.showAddFilter) && (
          <EuiFlexItem grow={false}>
            <AddFilterPopover
              indexPatterns={props.indexPatterns}
              filters={props.filters}
              timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
              filtersForSuggestions={props.filtersForSuggestions}
              onFiltersUpdated={props.onFiltersUpdated}
              buttonProps={{ size: shouldShowDatePickerAsBadge() ? 's' : 'm', display: 'empty' }}
              isDisabled={props.isDisabled}
            />
          </EuiFlexItem>
        )
      );
    }

    function renderFilterButtonGroup() {
      return (
        (Boolean(props.showAddFilter) || Boolean(props.prepend)) && (
          <EuiFlexItem grow={false}>
            <FilterButtonGroup
              items={[props.prepend, renderAddButton()]}
              attached={renderFilterMenuOnly()}
              size={shouldShowDatePickerAsBadge() ? 's' : 'm'}
            />
          </EuiFlexItem>
        )
      );
    }

    function renderQueryInput() {
      return (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {!renderFilterMenuOnly() && renderFilterButtonGroup()}
          {shouldRenderQueryInput() && (
            <EuiFlexItem data-test-subj="unifiedQueryInput">
              <QueryStringInputUI
                disableAutoFocus={props.disableAutoFocus}
                indexPatterns={props.indexPatterns!}
                query={props.query! as Query}
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
                filtersForSuggestions={props.filtersForSuggestions}
                disableLanguageSwitcher={true}
                prepend={renderFilterMenuOnly() && renderFilterButtonGroup()}
                size={props.suggestionsSize}
                isDisabled={props.isDisabled}
                appName={appName}
                submitOnBlur={props.submitOnBlur}
                deps={{
                  unifiedSearch,
                  data,
                  storage,
                  usageCollection,
                  notifications,
                  docLinks,
                  http,
                  uiSettings,
                  dataViews,
                }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }

    function renderTextLangEditor() {
      return (
        isQueryLangSelected &&
        props.query &&
        isOfAggregateQueryType(props.query) && (
          <TextBasedLangEditor
            query={props.query}
            onTextLangQueryChange={props.onTextLangQueryChange}
            expandCodeEditor={(status: boolean) => setCodeEditorIsExpanded(status)}
            isCodeEditorExpanded={codeEditorIsExpanded}
            errors={props.textBasedLanguageModeErrors}
            onTextLangQuerySubmit={() =>
              onSubmit({
                query: queryRef.current,
                dateRange: dateRangeRef.current,
              })
            }
            isDisabled={props.isDisabled}
            data-test-subj="unifiedTextLangEditor"
          />
        )
      );
    }

    const isScreenshotMode = props.isScreenshotMode === true;

    return (
      <>
        <SharingMetaFields
          from={currentDateRange.from}
          to={currentDateRange.to}
          dateFormat={uiSettings.get('dateFormat')}
        />
        {!isScreenshotMode && (
          <>
            <EuiFlexGroup
              className="kbnQueryBar"
              direction={isMobile && !shouldShowDatePickerAsBadge() ? 'column' : 'row'}
              responsive={false}
              gutterSize="s"
              justifyContent={shouldShowDatePickerAsBadge() ? 'flexStart' : 'flexEnd'}
              wrap
            >
              {renderDataViewsPicker()}
              <EuiFlexItem
                grow={!shouldShowDatePickerAsBadge()}
                style={{ minWidth: shouldShowDatePickerAsBadge() ? 'auto' : 320, maxWidth: '100%' }}
              >
                {!isQueryLangSelected
                  ? renderQueryInput()
                  : !codeEditorIsExpanded
                  ? renderTextLangEditor()
                  : null}
              </EuiFlexItem>
              {shouldShowDatePickerAsBadge() && props.filterBar}
              {renderUpdateButton()}
            </EuiFlexGroup>
            {!shouldShowDatePickerAsBadge() && props.filterBar}
            {codeEditorIsExpanded && renderTextLangEditor()}
          </>
        )}
      </>
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
) as GenericQueryBarTopRow;

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default QueryBarTopRow;
