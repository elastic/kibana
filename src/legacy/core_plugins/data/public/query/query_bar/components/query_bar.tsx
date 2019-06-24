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

import { doesKueryExpressionHaveLuceneSyntaxError } from '@kbn/es-query';
import { IndexPattern } from 'ui/index_patterns';

import classNames from 'classnames';
import _ from 'lodash';
import { get, isEqual } from 'lodash';
import React, { Component } from 'react';
import { Storage } from 'ui/storage';
import { timeHistory } from 'ui/timefilter/time_history';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSuperDatePicker } from '@elastic/eui';

// @ts-ignore
import { EuiSuperUpdateButton } from '@elastic/eui';

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { documentationLinks } from 'ui/documentation_links';
import { Toast, toastNotifications } from 'ui/notify';
import chrome from 'ui/chrome';
import { PersistedLog } from 'ui/persisted_log';
import { QueryBarInput } from './query_bar_input';

import { getQueryLog } from '../lib/get_query_log';
import { Query } from '../index';

const config = chrome.getUiSettingsClient();

interface DateRange {
  from: string;
  to: string;
}

interface Props {
  query: Query;
  onSubmit: (payload: { dateRange: DateRange; query: Query }) => void;
  disableAutoFocus?: boolean;
  appName: string;
  screenTitle: string;
  indexPatterns: Array<IndexPattern | string>;
  store: Storage;
  intl: InjectedIntl;
  prepend?: any;
  showDatePicker?: boolean;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  isRefreshPaused?: boolean;
  refreshInterval?: number;
  showAutoRefreshOnly?: boolean;
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
  customSubmitButton?: any;
}

interface State {
  query: Query;
  inputIsPristine: boolean;
  currentProps?: Props;
  dateRangeFrom: string;
  dateRangeTo: string;
  isDateRangeInvalid: boolean;
}

export class QueryBarUI extends Component<Props, State> {
  public static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (isEqual(prevState.currentProps, nextProps)) {
      return null;
    }

    let nextQuery = null;
    if (nextProps.query.query !== prevState.query.query) {
      nextQuery = {
        query: nextProps.query.query,
        language: nextProps.query.language,
      };
    } else if (nextProps.query.language !== prevState.query.language) {
      nextQuery = {
        query: '',
        language: nextProps.query.language,
      };
    }

    let nextDateRange = null;
    if (
      nextProps.dateRangeFrom !== get(prevState, 'currentProps.dateRangeFrom') ||
      nextProps.dateRangeTo !== get(prevState, 'currentProps.dateRangeTo')
    ) {
      nextDateRange = {
        dateRangeFrom: nextProps.dateRangeFrom,
        dateRangeTo: nextProps.dateRangeTo,
      };
    }

    const nextState: any = {
      currentProps: nextProps,
    };
    if (nextQuery) {
      nextState.query = nextQuery;
    }
    if (nextDateRange) {
      nextState.dateRangeFrom = nextDateRange.dateRangeFrom;
      nextState.dateRangeTo = nextDateRange.dateRangeTo;
    }
    return nextState;
  }

  /*
   Keep the "draft" value in local state until the user actually submits the query. There are a couple advantages:

    1. Each app doesn't have to maintain its own "draft" value if it wants to put off updating the query in app state
    until the user manually submits their changes. Most apps have watches on the query value in app state so we don't
    want to trigger those on every keypress. Also, some apps (e.g. dashboard) already juggle multiple query values,
    each with slightly different semantics and I'd rather not add yet another variable to the mix.

    2. Changes to the local component state won't trigger an Angular digest cycle. Triggering digest cycles on every
    keypress has been a major source of performance issues for us in previous implementations of the query bar.
    See https://github.com/elastic/kibana/issues/14086
  */
  public state = {
    query: {
      query: this.props.query.query,
      language: this.props.query.language,
    },
    inputIsPristine: true,
    currentProps: this.props,
    dateRangeFrom: _.get(this.props, 'dateRangeFrom', 'now-15m'),
    dateRangeTo: _.get(this.props, 'dateRangeTo', 'now'),
    isDateRangeInvalid: false,
  };

  public inputRef: HTMLInputElement | null = null;

  private persistedLog: PersistedLog | undefined;

  public isDirty = () => {
    if (!this.props.showDatePicker) {
      return this.state.query.query !== this.props.query.query;
    }

    return (
      this.state.query.query !== this.props.query.query ||
      this.state.dateRangeFrom !== this.props.dateRangeFrom ||
      this.state.dateRangeTo !== this.props.dateRangeTo
    );
  };

  public onClickSubmitButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (this.persistedLog) {
      this.persistedLog.add(this.state.query.query);
    }
    this.onSubmit(() => event.preventDefault());
  };

  public onChange = (query: Query) => {
    this.setState({
      query,
      inputIsPristine: false,
    });
  };

  public onTimeChange = ({
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
    this.setState(
      {
        dateRangeFrom: start,
        dateRangeTo: end,
        isDateRangeInvalid: isInvalid,
      },
      () => isQuickSelection && this.onSubmit()
    );
  };

  public onSubmit = (preventDefault?: () => void) => {
    if (preventDefault) {
      preventDefault();
    }

    this.handleLuceneSyntaxWarning();

    timeHistory.add({
      from: this.state.dateRangeFrom,
      to: this.state.dateRangeTo,
    });

    this.props.onSubmit({
      query: {
        query: this.state.query.query,
        language: this.state.query.language,
      },
      dateRange: {
        from: this.state.dateRangeFrom,
        to: this.state.dateRangeTo,
      },
    });
  };

  private onInputSubmit = (query: Query) => {
    this.setState({ query }, () => {
      this.onSubmit();
    });
  };

  public componentDidMount() {
    this.persistedLog = getQueryLog(this.props.appName, this.props.query.language);
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.query.language !== this.props.query.language) {
      this.persistedLog = getQueryLog(this.props.appName, this.props.query.language);
    }
  }

  public render() {
    const classes = classNames('kbnQueryBar', {
      'kbnQueryBar--withDatePicker': this.props.showDatePicker,
    });

    return (
      <EuiFlexGroup className={classes} responsive={!!this.props.showDatePicker} gutterSize="s">
        <EuiFlexItem>
          <QueryBarInput
            appName={this.props.appName}
            disableAutoFocus={this.props.disableAutoFocus}
            indexPatterns={this.props.indexPatterns}
            prepend={this.props.prepend}
            query={this.state.query}
            screenTitle={this.props.screenTitle}
            store={this.props.store}
            onChange={this.onChange}
            onSubmit={this.onInputSubmit}
            persistedLog={this.persistedLog}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{this.renderUpdateButton()}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderUpdateButton() {
    const button = this.props.customSubmitButton ? (
      React.cloneElement(this.props.customSubmitButton, { onClick: this.onClickSubmitButton })
    ) : (
      <EuiSuperUpdateButton
        needsUpdate={this.isDirty()}
        isDisabled={this.state.isDateRangeInvalid}
        onClick={this.onClickSubmitButton}
        data-test-subj="querySubmitButton"
      />
    );

    if (!this.props.showDatePicker) {
      return button;
    }

    return (
      <EuiFlexGroup responsive={false} gutterSize="s">
        {this.renderDatePicker()}
        <EuiFlexItem grow={false}>{button}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderDatePicker() {
    if (!this.props.showDatePicker) {
      return null;
    }

    const recentlyUsedRanges = timeHistory
      .get()
      .map(({ from, to }: { from: string; to: string }) => {
        return {
          start: from,
          end: to,
        };
      });

    const commonlyUsedRanges = config
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
          start={this.state.dateRangeFrom}
          end={this.state.dateRangeTo}
          isPaused={this.props.isRefreshPaused}
          refreshInterval={this.props.refreshInterval}
          onTimeChange={this.onTimeChange}
          onRefreshChange={this.props.onRefreshChange}
          showUpdateButton={false}
          recentlyUsedRanges={recentlyUsedRanges}
          commonlyUsedRanges={commonlyUsedRanges}
          dateFormat={config.get('dateFormat')}
          isAutoRefreshOnly={this.props.showAutoRefreshOnly}
        />
      </EuiFlexItem>
    );
  }

  private handleLuceneSyntaxWarning() {
    const { intl, store } = this.props;
    const { query, language } = this.state.query;
    if (
      language === 'kuery' &&
      typeof query === 'string' &&
      !store.get('kibana.luceneSyntaxWarningOptOut') &&
      doesKueryExpressionHaveLuceneSyntaxError(query)
    ) {
      const toast = toastNotifications.addWarning({
        title: intl.formatMessage({
          id: 'data.query.queryBar.luceneSyntaxWarningTitle',
          defaultMessage: 'Lucene syntax warning',
        }),
        text: (
          <div>
            <p>
              <FormattedMessage
                id="data.query.queryBar.luceneSyntaxWarningMessage"
                defaultMessage="It looks like you may be trying to use Lucene query syntax, although you
               have Kibana Query Language (KQL) selected. Please review the KQL docs {link}."
                values={{
                  link: (
                    <EuiLink href={documentationLinks.query.kueryQuerySyntax} target="_blank">
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
                <EuiButton size="s" onClick={() => this.onLuceneSyntaxWarningOptOut(toast)}>
                  Don't show again
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      });
    }
  }

  private onLuceneSyntaxWarningOptOut(toast: Toast) {
    this.props.store.set('kibana.luceneSyntaxWarningOptOut', true);
    toastNotifications.remove(toast);
  }
}

// @ts-ignore
export const QueryBar = injectI18n(QueryBarUI);
