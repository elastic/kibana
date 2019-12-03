/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import dateMath from '@elastic/datemath';
import classNames from 'classnames';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSuperDatePicker,
  prettyDuration,
} from '@elastic/eui';
// @ts-ignore
import { EuiSuperUpdateButton, OnRefreshProps } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Toast } from 'src/core/public';
import {
  IDataPluginServices,
  IIndexPattern,
  TimeRange,
  TimeHistoryContract,
  Query,
  PersistedLog,
  getQueryLog,
  esKuery,
} from '../..';
import { useKibana, toMountPoint } from '../../../../kibana_react/public';
import { QueryStringInput } from './query_string_input';

interface Props {
  query?: Query;
  onSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  dataTestSubj?: string;
  disableAutoFocus?: boolean;
  screenTitle?: string;
  indexPatterns?: Array<IIndexPattern | string>;
  intl: InjectedIntl;
  isLoading?: boolean;
  prepend?: React.ReactNode;
  showQueryInput?: boolean;
  showDatePicker?: boolean;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  isRefreshPaused?: boolean;
  refreshInterval?: number;
  showAutoRefreshOnly?: boolean;
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
  customSubmitButton?: any;
  isDirty: boolean;
  timeHistory?: TimeHistoryContract;
}

function QueryBarTopRowUI(props: Props) {
  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);

  const kibana = useKibana<IDataPluginServices>();
  const { uiSettings, notifications, storage, appName, docLinks } = kibana.services;

  const kueryQuerySyntaxLink: string = docLinks!.links.query.kueryQuerySyntax;

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
    const defaultTimeSetting = uiSettings!.get('timepicker:timeDefaults');
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
    handleLuceneSyntaxWarning();

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
          onSubmit={onInputSubmit}
          persistedLog={persistedLog}
          dataTestSubj={props.dataTestSubj}
        />
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
      <EuiSuperUpdateButton
        needsUpdate={props.isDirty}
        isDisabled={isDateRangeInvalid}
        isLoading={props.isLoading}
        onClick={onClickSubmitButton}
        data-test-subj="querySubmitButton"
      />
    );

    if (!shouldRenderDatePicker()) {
      return button;
    }

    return (
      <EuiFlexGroup responsive={false} gutterSize="s">
        {renderDatePicker()}
        <EuiFlexItem grow={false}>{button}</EuiFlexItem>
      </EuiFlexGroup>
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
      .get('timepicker:quickRanges')
      .map(({ from, to, display }: { from: string; to: string; display: string }) => {
        return {
          start: from,
          end: to,
          label: display,
        };
      });

    return (
      <EuiFlexItem className="kbnQueryBar__datePickerWrapper">
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
        />
      </EuiFlexItem>
    );
  }

  function handleLuceneSyntaxWarning() {
    if (!props.query) return;
    const { intl } = props;
    const { query, language } = props.query;
    if (
      language === 'kuery' &&
      typeof query === 'string' &&
      (!storage || !storage.get('kibana.luceneSyntaxWarningOptOut')) &&
      esKuery.doesKueryExpressionHaveLuceneSyntaxError(query)
    ) {
      const toast = notifications!.toasts.addWarning({
        title: intl.formatMessage({
          id: 'data.query.queryBar.luceneSyntaxWarningTitle',
          defaultMessage: 'Lucene syntax warning',
        }),
        text: toMountPoint(
          <div>
            <p>
              <FormattedMessage
                id="data.query.queryBar.luceneSyntaxWarningMessage"
                defaultMessage="It looks like you may be trying to use Lucene query syntax, although you
               have Kibana Query Language (KQL) selected. Please review the KQL docs {link}."
                values={{
                  link: (
                    <EuiLink href={kueryQuerySyntaxLink} target="_blank">
                      <FormattedMessage
                        id="data.query.queryBar.syntaxOptionsDescription.docsLinkText"
                        defaultMessage="here"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton size="s" onClick={() => onLuceneSyntaxWarningOptOut(toast)}>
                  <FormattedMessage
                    id="data.query.queryBar.luceneSyntaxWarningOptOutText"
                    defaultMessage="Don't show again"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      });
    }
  }

  function onLuceneSyntaxWarningOptOut(toast: Toast) {
    if (!storage) return;
    storage.set('kibana.luceneSyntaxWarningOptOut', true);
    notifications!.toasts.remove(toast);
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
      {renderSharingMetaFields()}
      <EuiFlexItem grow={false}>{renderUpdateButton()}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

QueryBarTopRowUI.defaultProps = {
  showQueryInput: true,
  showDatePicker: true,
  showAutoRefreshOnly: false,
};

export const QueryBarTopRow = injectI18n(QueryBarTopRowUI);
