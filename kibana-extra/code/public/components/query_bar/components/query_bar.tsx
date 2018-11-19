/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module '@elastic/eui' {
  export const EuiOutsideClickDetector: SFC<any>;
}

import { debounce, isEqual } from 'lodash';
import React, { Component, SFC } from 'react';

import { matchPairs } from '../lib/match_pairs';
import { SuggestionsComponent } from './typeahead/suggestions_component';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { AutocompleteSuggestion, SuggestionsProvider } from '../suggestions';

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

interface Props {
  query: string;
  onSubmit: (query: string) => void;
  onSelect: (item: AutocompleteSuggestion) => void;
  disableAutoFocus?: boolean;
  appName: string;
  suggestionsProvider: SuggestionsProvider;
}

interface State {
  query: string;
  inputIsPristine: boolean;
  isSuggestionsVisible: boolean;
  index: number | null;
  suggestions: AutocompleteSuggestion[];
  suggestionLimit: number;
  currentProps?: Props;
}

export class QueryBar extends Component<Props, State> {
  public static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (isEqual(prevState.currentProps, nextProps)) {
      return null;
    }

    if (nextProps.query !== prevState.query) {
      return {
        query: nextProps.query,
        currentProps: nextProps,
      };
    }
    return null;
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
    query: this.props.query,
    inputIsPristine: true,
    isSuggestionsVisible: false,
    index: null,
    suggestions: [],
    suggestionLimit: 50,
  };

  public updateSuggestions = debounce(async () => {
    const suggestions = (await this.getSuggestions()) || [];
    if (!this.componentIsUnmounting) {
      this.setState({ suggestions });
    }
  }, 100);

  public inputRef: HTMLInputElement | null = null;

  private componentIsUnmounting = false;

  public isDirty = () => {
    return this.state.query !== this.props.query;
  };

  public increaseLimit = () => {
    this.setState({
      suggestionLimit: this.state.suggestionLimit + 50,
    });
  };

  public incrementIndex = (currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= this.state.suggestions.length) {
      nextIndex = 0;
    }
    this.setState({ index: nextIndex });
  };

  public decrementIndex = (currentIndex: number) => {
    const previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      this.setState({ index: this.state.suggestions.length - 1 });
    } else {
      this.setState({ index: previousIndex });
    }
  };

  public getSuggestions = async () => {
    if (!this.inputRef) {
      return;
    }

    const { query } = this.state;

    if (!this.props.suggestionsProvider) {
      return [];
    }

    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    return await this.props.suggestionsProvider.getSuggestions(query);
  };

  public selectSuggestion = (item: AutocompleteSuggestion) => {
    const { text, start, end } = item;
    if (!this.inputRef) {
      return;
    }

    const query = this.state.query;
    const { selectionStart, selectionEnd } = this.inputRef;
    if (selectionStart === null || selectionEnd === null) {
      return;
    }

    const value = query.substr(0, selectionStart) + query.substr(selectionEnd);

    this.setState(
      {
        query: value.substr(0, start) + text + value.substr(end),
        index: null,
      },
      () => {
        if (!this.inputRef) {
          return;
        }

        this.inputRef.setSelectionRange(start + text.length, start + text.length);

        this.props.onSelect(item);
      }
    );
  };

  public onOutsideClick = () => {
    this.setState({ isSuggestionsVisible: false, index: null });
  };

  public onClickInput = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      this.onInputChange(event.target.value);
    }
  };

  public onClickSubmitButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    this.onSubmit(() => event.preventDefault());
  };

  public onClickSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!this.inputRef) {
      return;
    }
    this.selectSuggestion(suggestion);
    this.inputRef.focus();
  };

  public onMouseEnterSuggestion = (index: number) => {
    this.setState({ index });
  };

  public onInputChange = (value: string) => {
    const hasValue = Boolean(value.trim());

    this.setState({
      query: value,
      inputIsPristine: false,
      isSuggestionsVisible: hasValue,
      index: null,
      suggestionLimit: 50,
    });
  };

  public onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.updateSuggestions();
    this.onInputChange(event.target.value);
  };

  public onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ([KEY_CODES.LEFT, KEY_CODES.RIGHT, KEY_CODES.HOME, KEY_CODES.END].includes(event.keyCode)) {
      this.setState({ isSuggestionsVisible: true });
      if (event.target instanceof HTMLInputElement) {
        this.onInputChange(event.target.value);
      }
    }
  };

  public onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.target instanceof HTMLInputElement) {
      const { isSuggestionsVisible, index } = this.state;
      const preventDefault = event.preventDefault.bind(event);
      const { target, key, metaKey } = event;
      const { value, selectionStart, selectionEnd } = target;
      const updateQuery = (query: string, newSelectionStart: number, newSelectionEnd: number) => {
        this.setState(
          {
            query,
          },
          () => {
            target.setSelectionRange(newSelectionStart, newSelectionEnd);
          }
        );
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
          event.preventDefault();
          if (isSuggestionsVisible && index !== null && this.state.suggestions[index]) {
            this.selectSuggestion(this.state.suggestions[index]);
          } else {
            this.onSubmit(() => event.preventDefault());
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

  public onSubmit = (preventDefault?: () => void) => {
    if (preventDefault) {
      preventDefault();
    }

    this.props.onSubmit(this.state.query);
    this.setState({ isSuggestionsVisible: false });
  };

  public componentDidMount() {
    this.updateSuggestions();
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.query !== this.props.query) {
      this.updateSuggestions();
    }
  }

  public componentWillUnmount() {
    this.updateSuggestions.cancel();
    this.componentIsUnmounting = true;
  }

  public render() {
    const inputRef = (node: HTMLInputElement | null) => {
      if (node) {
        this.inputRef = node;
      }
    };
    const activeDescendant = this.state.isSuggestionsVisible
      ? 'suggestion-' + this.state.index
      : '';
    return (
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <EuiOutsideClickDetector onOutsideClick={this.onOutsideClick}>
            {/* position:relative required on container so the suggestions appear under the query bar*/}
            <div
              style={{ position: 'relative' }}
              role="combobox"
              aria-haspopup="true"
              aria-expanded={this.state.isSuggestionsVisible}
              aria-owns="typeahead-items"
            >
              <form role="form" name="queryBarForm">
                <div className="kuiLocalSearch" role="search">
                  <div className="kuiLocalSearchAssistedInput">
                    <EuiFieldText
                      className="kuiLocalSearchAssistedInput__input"
                      placeholder="Search... (e.g. java.lang.String)"
                      value={this.state.query}
                      onKeyDown={this.onKeyDown}
                      onKeyUp={this.onKeyUp}
                      onChange={this.onChange}
                      onClick={this.onClickInput}
                      fullWidth={true}
                      autoFocus={!this.props.disableAutoFocus}
                      inputRef={inputRef}
                      autoComplete="off"
                      spellCheck={false}
                      icon="search"
                      aria-label="Search input"
                      type="text"
                      data-test-subj="queryInput"
                      aria-autocomplete="list"
                      aria-controls="typeahead-items"
                      aria-activedescendant={activeDescendant}
                      role="textbox"
                    />
                  </div>
                </div>
              </form>

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
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
