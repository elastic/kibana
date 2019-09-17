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

import classNames from 'classnames';
import React, { Component } from 'react';
import { Storage } from 'ui/storage';
import { timeHistory } from 'ui/timefilter';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSuperDatePicker } from '@elastic/eui';

// @ts-ignore
import { EuiSuperUpdateButton } from '@elastic/eui';

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { documentationLinks } from 'ui/documentation_links';
import { PersistedLog } from 'ui/persisted_log';
import {
  UiSettingsClientContract,
  SavedObjectsClientContract,
  Toast,
  CoreStart,
  HttpServiceBase,
} from 'src/core/public';
import { IndexPattern } from '../../../index_patterns';
import { QueryBarInput } from './query_bar_input';

import { getQueryLog } from '../lib/get_query_log';
import { Query } from '../index';

interface DateRange {
  from: string;
  to: string;
}

interface Props {
  query?: Query;
  onSubmit: (payload: { dateRange: DateRange; query?: Query }) => void;
  onChange: (payload: { dateRange: DateRange; query?: Query }) => void;
  disableAutoFocus?: boolean;
  appName: string;
  screenTitle?: string;
  indexPatterns?: Array<IndexPattern | string>;
  store?: Storage;
  intl: InjectedIntl;
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
  toasts: CoreStart['notifications']['toasts'];
  uiSettings: UiSettingsClientContract;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpServiceBase;
}

interface State {
  isDateRangeInvalid: boolean;
}

export class QueryBarTopRowUI extends Component<Props, State> {
  public static defaultProps = {
    showQueryInput: true,
    showDatePicker: true,
    showAutoRefreshOnly: false,
  };

  public state = {
    isDateRangeInvalid: false,
  };

  public inputRef: HTMLInputElement | null = null;

  private persistedLog: PersistedLog | undefined;

  public onClickSubmitButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (this.persistedLog && this.props.query) {
      this.persistedLog.add(this.props.query.query);
    }
    event.preventDefault();
    this.onSubmit({ query: this.props.query, dateRange: this.getDateRange() });
  };

  public getDateRange() {
    const defaultTimeSetting = this.props.uiSettings.get('timepicker:timeDefaults');
    return {
      from: this.props.dateRangeFrom || defaultTimeSetting.from,
      to: this.props.dateRangeTo || defaultTimeSetting.to,
    };
  }

  public onQueryChange = (query: Query) => {
    this.props.onChange({
      query,
      dateRange: this.getDateRange(),
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
        isDateRangeInvalid: isInvalid,
      },
      () => {
        const retVal = {
          query: this.props.query,
          dateRange: {
            from: start,
            to: end,
          },
        };

        if (isQuickSelection) {
          this.props.onSubmit(retVal);
        } else {
          this.props.onChange(retVal);
        }
      }
    );
  };

  public onSubmit = ({ query, dateRange }: { query?: Query; dateRange: DateRange }) => {
    this.handleLuceneSyntaxWarning();
    timeHistory.add(dateRange);

    this.props.onSubmit({ query, dateRange });
  };

  private onInputSubmit = (query: Query) => {
    this.onSubmit({
      query,
      dateRange: this.getDateRange(),
    });
  };

  public componentDidMount() {
    if (!this.props.query) return;
    this.persistedLog = getQueryLog(
      this.props.uiSettings,
      this.props.appName,
      this.props.query.language
    );
  }

  public componentDidUpdate(prevProps: Props) {
    if (!this.props.query || !prevProps.query) return;
    if (prevProps.query.language !== this.props.query.language) {
      this.persistedLog = getQueryLog(
        this.props.uiSettings,
        this.props.appName,
        this.props.query.language
      );
    }
  }

  public render() {
    const classes = classNames('kbnQueryBar', {
      'kbnQueryBar--withDatePicker': this.props.showDatePicker,
    });

    return (
      <EuiFlexGroup
        className={classes}
        responsive={!!this.props.showDatePicker}
        gutterSize="s"
        justifyContent="flexEnd"
      >
        {this.renderQueryInput()}
        <EuiFlexItem grow={false}>{this.renderUpdateButton()}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderQueryInput() {
    if (!this.shouldRenderQueryInput()) return;
    return (
      <EuiFlexItem>
        <QueryBarInput
          appName={this.props.appName}
          disableAutoFocus={this.props.disableAutoFocus}
          indexPatterns={this.props.indexPatterns!}
          prepend={this.props.prepend}
          query={this.props.query!}
          screenTitle={this.props.screenTitle}
          store={this.props.store!}
          onChange={this.onQueryChange}
          onSubmit={this.onInputSubmit}
          persistedLog={this.persistedLog}
          uiSettings={this.props.uiSettings}
          savedObjectsClient={this.props.savedObjectsClient}
          http={this.props.http}
        />
      </EuiFlexItem>
    );
  }

  private shouldRenderDatePicker() {
    return this.props.showDatePicker || this.props.showAutoRefreshOnly;
  }

  private shouldRenderQueryInput() {
    return (
      this.props.showQueryInput && this.props.indexPatterns && this.props.query && this.props.store
    );
  }

  private renderUpdateButton() {
    const button = this.props.customSubmitButton ? (
      React.cloneElement(this.props.customSubmitButton, { onClick: this.onClickSubmitButton })
    ) : (
      <EuiSuperUpdateButton
        needsUpdate={this.props.isDirty}
        isDisabled={this.state.isDateRangeInvalid}
        onClick={this.onClickSubmitButton}
        data-test-subj="querySubmitButton"
      />
    );

    if (!this.shouldRenderDatePicker()) {
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
    if (!this.shouldRenderDatePicker()) {
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

    const commonlyUsedRanges = this.props.uiSettings
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
          start={this.props.dateRangeFrom}
          end={this.props.dateRangeTo}
          isPaused={this.props.isRefreshPaused}
          refreshInterval={this.props.refreshInterval}
          onTimeChange={this.onTimeChange}
          onRefreshChange={this.props.onRefreshChange}
          showUpdateButton={false}
          recentlyUsedRanges={recentlyUsedRanges}
          commonlyUsedRanges={commonlyUsedRanges}
          dateFormat={this.props.uiSettings.get('dateFormat')}
          isAutoRefreshOnly={this.props.showAutoRefreshOnly}
        />
      </EuiFlexItem>
    );
  }

  private handleLuceneSyntaxWarning() {
    if (!this.props.query) return;
    const { intl, store, toasts } = this.props;
    const { query, language } = this.props.query;
    if (
      language === 'kuery' &&
      typeof query === 'string' &&
      (!store || !store.get('kibana.luceneSyntaxWarningOptOut')) &&
      doesKueryExpressionHaveLuceneSyntaxError(query)
    ) {
      const toast = toasts.addWarning({
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

  private onLuceneSyntaxWarningOptOut(toast: Toast) {
    if (!this.props.store) return;
    this.props.store.set('kibana.luceneSyntaxWarningOptOut', true);
    this.props.toasts.remove(toast);
  }
}

// @ts-ignore
export const QueryBarTopRow = injectI18n(QueryBarTopRowUI);
