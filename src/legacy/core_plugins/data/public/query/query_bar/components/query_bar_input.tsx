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

import { Component } from 'react';
import React from 'react';

import { EuiFieldText, EuiOutsideClickDetector, PopoverAnchorPosition } from '@elastic/eui';

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  AutocompleteSuggestion,
  AutocompleteSuggestionType,
  getAutocompleteProvider,
} from 'ui/autocomplete_providers';
import { debounce, compact, isEqual, omit } from 'lodash';
import { IndexPattern, StaticIndexPattern } from 'ui/index_patterns';
import { PersistedLog } from 'ui/persisted_log';
import chrome from 'ui/chrome';
import { kfetch } from 'ui/kfetch';
import { Storage } from 'ui/storage';
import { localStorage } from 'ui/storage/storage_service';
import { Query } from '../index';
import { fromUser, matchPairs, toUser } from '../lib';
import { QueryLanguageSwitcher } from './language_switcher';
import { SuggestionsComponent } from './typeahead/suggestions_component';
import { getQueryLog } from '../lib/get_query_log';
import { fetchIndexPatterns } from '../lib/fetch_index_patterns';

interface Props {
  indexPatterns: Array<IndexPattern | string>;
  intl: InjectedIntl;
  query: Query;
  appName: string;
  disableAutoFocus?: boolean;
  screenTitle?: string;
  prepend?: any;
  store?: Storage;
  persistedLog?: PersistedLog;
  bubbleSubmitEvent?: boolean;
  languageSwitcherPopoverAnchorPosition?: PopoverAnchorPosition;
  onChange?: (query: Query) => void;
  onSubmit?: (query: Query) => void;
}

interface State {
  isSuggestionsVisible: boolean;
  index: number | null;
  suggestions: AutocompleteSuggestion[];
  suggestionLimit: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  indexPatterns: StaticIndexPattern[];
}

const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  ESC: 27,
  TAB: 9,
  HOME: 36,
  END: 35,
};

const config = chrome.getUiSettingsClient();
const recentSearchType: AutocompleteSuggestionType = 'recentSearch';

export class QueryBarInputUI extends Component<Props, State> {
  public state = {
    isSuggestionsVisible: false,
    index: null,
    suggestions: [],
    suggestionLimit: 50,
    selectionStart: null,
    selectionEnd: null,
    indexPatterns: [],
  };

  public inputRef: HTMLInputElement | null = null;

  private persistedLog: PersistedLog | undefined;
  private componentIsUnmounting = false;

  private getQueryString = () => {
    return toUser(this.props.query.query);
  };

  private fetchIndexPatterns = async () => {
    const stringPatterns = this.props.indexPatterns.filter(
      indexPattern => typeof indexPattern === 'string'
    ) as string[];
    const objectPatterns = this.props.indexPatterns.filter(
      indexPattern => typeof indexPattern !== 'string'
    ) as IndexPattern[];

    const objectPatternsFromStrings = await fetchIndexPatterns(stringPatterns);

    this.setState({
      indexPatterns: [...objectPatterns, ...objectPatternsFromStrings],
    });
  };

  private getSuggestions = async () => {
    if (!this.inputRef) {
      return;
    }

    const language = this.props.query.language;
    const queryString = this.getQueryString();

    const recentSearchSuggestions = this.getRecentSearchSuggestions(queryString);

    const autocompleteProvider = getAutocompleteProvider(language);
    if (
      !autocompleteProvider ||
      !Array.isArray(this.state.indexPatterns) ||
      compact(this.state.indexPatterns).length === 0
    ) {
      return recentSearchSuggestions;
    }

    const indexPatterns = this.state.indexPatterns;
    const getAutocompleteSuggestions = autocompleteProvider({ config, indexPatterns });

    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    const suggestions: AutocompleteSuggestion[] = await getAutocompleteSuggestions({
      query: queryString,
      selectionStart,
      selectionEnd,
    });
    return [...suggestions, ...recentSearchSuggestions];
  };

  private getRecentSearchSuggestions = (query: string) => {
    if (!this.persistedLog) {
      return [];
    }
    const recentSearches = this.persistedLog.get();
    const matchingRecentSearches = recentSearches.filter(recentQuery => {
      const recentQueryString = typeof recentQuery === 'object' ? toUser(recentQuery) : recentQuery;
      return recentQueryString.includes(query);
    });
    return matchingRecentSearches.map(recentSearch => {
      const text = toUser(recentSearch);
      const start = 0;
      const end = query.length;
      return { type: recentSearchType, text, start, end };
    });
  };

  private updateSuggestions = debounce(async () => {
    const suggestions = (await this.getSuggestions()) || [];
    if (!this.componentIsUnmounting) {
      this.setState({ suggestions });
    }
  }, 100);

  private onSubmit = (query: Query) => {
    if (this.props.onSubmit) {
      if (this.persistedLog) {
        this.persistedLog.add(query.query);
      }

      this.props.onSubmit({ query: fromUser(query.query), language: query.language });
    }
  };

  private onChange = (query: Query) => {
    this.updateSuggestions();

    if (this.props.onChange) {
      this.props.onChange({ query: fromUser(query.query), language: query.language });
    }
  };

  private onQueryStringChange = (value: string) => {
    const hasValue = Boolean(value.trim());

    this.setState({
      isSuggestionsVisible: hasValue,
      index: null,
      suggestionLimit: 50,
    });

    this.onChange({ query: value, language: this.props.query.language });
  };

  private onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.onQueryStringChange(event.target.value);
  };

  private onClickInput = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      this.onQueryStringChange(event.target.value);
    }
  };

  private onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ([KEY_CODES.LEFT, KEY_CODES.RIGHT, KEY_CODES.HOME, KEY_CODES.END].includes(event.keyCode)) {
      this.setState({ isSuggestionsVisible: true });
      if (event.target instanceof HTMLInputElement) {
        this.onQueryStringChange(event.target.value);
      }
    }
  };

  private onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      const { isSuggestionsVisible, index } = this.state;
      const preventDefault = event.preventDefault.bind(event);
      const { target, key, metaKey } = event;
      const { value, selectionStart, selectionEnd } = target;
      const updateQuery = (query: string, newSelectionStart: number, newSelectionEnd: number) => {
        this.onQueryStringChange(query);
        this.setState({
          selectionStart: newSelectionStart,
          selectionEnd: newSelectionEnd,
        });
      };

      switch (event.keyCode) {
        case KEY_CODES.DOWN:
          event.preventDefault();
          if (isSuggestionsVisible && index !== null) {
            this.incrementIndex(index);
          } else {
            this.setState({ isSuggestionsVisible: true, index: 0 });
          }
          break;
        case KEY_CODES.UP:
          event.preventDefault();
          if (isSuggestionsVisible && index !== null) {
            this.decrementIndex(index);
          }
          break;
        case KEY_CODES.ENTER:
          if (!this.props.bubbleSubmitEvent) {
            event.preventDefault();
          }
          if (isSuggestionsVisible && index !== null && this.state.suggestions[index]) {
            event.preventDefault();
            this.selectSuggestion(this.state.suggestions[index]);
          } else {
            this.onSubmit(this.props.query);
            this.setState({
              isSuggestionsVisible: false,
            });
          }
          break;
        case KEY_CODES.ESC:
          event.preventDefault();
          this.setState({ isSuggestionsVisible: false, index: null });
          break;
        case KEY_CODES.TAB:
          this.setState({ isSuggestionsVisible: false, index: null });
          break;
        default:
          if (selectionStart !== null && selectionEnd !== null) {
            matchPairs({
              value,
              selectionStart,
              selectionEnd,
              key,
              metaKey,
              updateQuery,
              preventDefault,
            });
          }

          break;
      }
    }
  };

  private selectSuggestion = ({
    type,
    text,
    start,
    end,
  }: {
    type: AutocompleteSuggestionType;
    text: string;
    start: number;
    end: number;
  }) => {
    if (!this.inputRef) {
      return;
    }

    const query = this.getQueryString();
    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    const value = query.substr(0, selectionStart) + query.substr(selectionEnd);
    const newQueryString = value.substr(0, start) + text + value.substr(end);

    this.onQueryStringChange(newQueryString);

    if (type === recentSearchType) {
      this.setState({ isSuggestionsVisible: false, index: null });
      this.onSubmit({ query: newQueryString, language: this.props.query.language });
    }
  };

  private increaseLimit = () => {
    this.setState({
      suggestionLimit: this.state.suggestionLimit + 50,
    });
  };

  private incrementIndex = (currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= this.state.suggestions.length) {
      nextIndex = 0;
    }
    this.setState({ index: nextIndex });
  };

  private decrementIndex = (currentIndex: number) => {
    const previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      this.setState({ index: this.state.suggestions.length - 1 });
    } else {
      this.setState({ index: previousIndex });
    }
  };

  private onSelectLanguage = (language: string) => {
    // Send telemetry info every time the user opts in or out of kuery
    // As a result it is important this function only ever gets called in the
    // UI component's change handler.
    kfetch({
      pathname: '/api/kibana/kql_opt_in_telemetry',
      method: 'POST',
      body: JSON.stringify({ opt_in: language === 'kuery' }),
    });

    if (this.props.store) {
      this.props.store.set('kibana.userQueryLanguage', language);
    } else {
      localStorage.set('kibana.userQueryLanguage', language);
    }

    const newQuery = { query: '', language };
    this.onChange(newQuery);
    this.onSubmit(newQuery);
  };

  private onOutsideClick = () => {
    if (this.state.isSuggestionsVisible) {
      this.setState({ isSuggestionsVisible: false, index: null });
    }
  };

  private onClickSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!this.inputRef) {
      return;
    }
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  public onMouseEnterSuggestion = (index: number) => {
    this.setState({ index });
  };

  public componentDidMount() {
    this.persistedLog = this.props.persistedLog
      ? this.props.persistedLog
      : getQueryLog(this.props.appName, this.props.query.language);

    this.fetchIndexPatterns().then(this.updateSuggestions);
  }

  public componentDidUpdate(prevProps: Props) {
    this.persistedLog = this.props.persistedLog
      ? this.props.persistedLog
      : getQueryLog(this.props.appName, this.props.query.language);

    if (!isEqual(prevProps.indexPatterns, this.props.indexPatterns)) {
      this.fetchIndexPatterns().then(this.updateSuggestions);
    } else if (!isEqual(prevProps.query, this.props.query)) {
      this.updateSuggestions();
    }

    if (this.state.selectionStart !== null && this.state.selectionEnd !== null) {
      if (this.inputRef) {
        // For some reason the type guard above does not make the compiler happy
        // @ts-ignore
        this.inputRef.setSelectionRange(this.state.selectionStart, this.state.selectionEnd);
      }
      this.setState({
        selectionStart: null,
        selectionEnd: null,
      });
    }
  }

  public componentWillUnmount() {
    this.updateSuggestions.cancel();
    this.componentIsUnmounting = true;
  }

  public render() {
    const rest = omit(this.props, [
      'indexPatterns',
      'intl',
      'query',
      'appName',
      'disableAutoFocus',
      'screenTitle',
      'prepend',
      'store',
      'persistedLog',
      'bubbleSubmitEvent',
      'languageSwitcherPopoverAnchorPosition',
      'onChange',
      'onSubmit',
    ]);

    return (
      <EuiOutsideClickDetector onOutsideClick={this.onOutsideClick}>
        <div
          style={{ position: 'relative' }}
          role="combobox"
          aria-haspopup="true"
          aria-expanded={this.state.isSuggestionsVisible}
          aria-owns="kbnTypeahead__items"
          aria-controls="kbnTypeahead__items"
        >
          <div role="search">
            <div className="kuiLocalSearchAssistedInput">
              <EuiFieldText
                placeholder={this.props.intl.formatMessage({
                  id: 'data.query.queryBar.searchInputPlaceholder',
                  defaultMessage: 'Search',
                })}
                value={this.getQueryString()}
                onKeyDown={this.onKeyDown}
                onKeyUp={this.onKeyUp}
                onChange={this.onInputChange}
                onClick={this.onClickInput}
                fullWidth
                autoFocus={!this.props.disableAutoFocus}
                inputRef={node => {
                  if (node) {
                    this.inputRef = node;
                  }
                }}
                autoComplete="off"
                spellCheck={false}
                aria-label={
                  this.props.screenTitle
                    ? this.props.intl.formatMessage(
                        {
                          id: 'data.query.queryBar.searchInputAriaLabel',
                          defaultMessage:
                            'You are on search box of {previouslyTranslatedPageTitle} page. Start typing to search and filter the {pageType}',
                        },
                        {
                          previouslyTranslatedPageTitle: this.props.screenTitle,
                          pageType: this.props.appName,
                        }
                      )
                    : undefined
                }
                type="text"
                data-test-subj="queryInput"
                aria-autocomplete="list"
                aria-controls="kbnTypeahead__items"
                aria-activedescendant={
                  this.state.isSuggestionsVisible ? 'suggestion-' + this.state.index : ''
                }
                role="textbox"
                prepend={this.props.prepend}
                append={
                  <QueryLanguageSwitcher
                    language={this.props.query.language}
                    anchorPosition={this.props.languageSwitcherPopoverAnchorPosition}
                    onSelectLanguage={this.onSelectLanguage}
                  />
                }
                {...rest}
              />
            </div>
          </div>

          <SuggestionsComponent
            show={this.state.isSuggestionsVisible}
            suggestions={this.state.suggestions.slice(0, this.state.suggestionLimit)}
            index={this.state.index}
            onClick={this.onClickSuggestion}
            onMouseEnter={this.onMouseEnterSuggestion}
            loadMore={this.increaseLimit}
          />
        </div>
      </EuiOutsideClickDetector>
    );
  }
}

export const QueryBarInput = injectI18n(QueryBarInputUI);
