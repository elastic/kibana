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
import { SavedQuery, SavedQueryAttributes } from '../../../search/search_bar';

const config = chrome.getUiSettingsClient();

interface DateRange {
  from: string;
  to: string;
}

interface Props {
  query: Query;
  savedQuery?: SavedQueryAttributes;
  onSubmit: (payload: { dateRange: DateRange; query: Query }) => void;
  onChange: (payload: { dateRange: DateRange; query: Query }) => void;
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
  onSave: () => void;
  onSaveNew: () => void;
  onLoadSavedQuery: (savedQuery: SavedQuery) => void;
  isDirty: boolean;
  onClose: () => void;
}

interface State {
  isDateRangeInvalid: boolean;
}

export class QueryBarUI extends Component<Props, State> {
  public state = {
    isDateRangeInvalid: false,
  };

  public inputRef: HTMLInputElement | null = null;

  private persistedLog: PersistedLog | undefined;

  public onClickSubmitButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (this.persistedLog) {
      this.persistedLog.add(this.props.query.query);
    }
    event.preventDefault();
    this.onSubmit({ query: this.props.query, dateRange: this.getDateRange() });
  };

  public getDateRange() {
    return {
      from: this.props.dateRangeFrom || 'now-15m',
      to: this.props.dateRangeTo || 'now',
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

  public onSubmit = ({ query, dateRange }: { query: Query; dateRange: DateRange }) => {
    this.handleLuceneSyntaxWarning();
    timeHistory.add(this.getDateRange());

    this.props.onSubmit({ query, dateRange });
  };

  private onInputSubmit = (query: Query) => {
    this.onSubmit({
      query,
      dateRange: this.getDateRange(),
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
            query={this.props.query}
            screenTitle={this.props.screenTitle}
            store={this.props.store}
            onChange={this.onQueryChange}
            onSubmit={this.onInputSubmit}
            persistedLog={this.persistedLog}
            savedQuery={this.props.savedQuery}
            onSave={this.props.onSave}
            onSaveNew={this.props.onSaveNew}
            onLoadSavedQuery={this.props.onLoadSavedQuery}
            isDirty={this.props.isDirty}
            onClose={this.props.onClose}
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
        needsUpdate={this.props.isDirty}
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
          start={this.props.dateRangeFrom}
          end={this.props.dateRangeTo}
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
    const { query, language } = this.props.query;
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
