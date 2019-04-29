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
import chrome from 'ui/chrome';
import { Field, IndexPattern } from 'ui/index_patterns';
import { getSuggestions } from 'ui/value_suggestions';
const config = chrome.getUiSettingsClient();

export interface PhraseSuggestorProps {
  indexPattern: IndexPattern;
  field?: Field;
}

export interface PhraseSuggestorState {
  suggestions: string[];
  isLoading: boolean;
}

/**
 * Since both "phrase" and "phrases" filter inputs suggest values (if enabled and the field is
 * aggregatable), we pull out the common logic for requesting suggestions into this component
 * which both of them extend.
 */
export class PhraseSuggestor<T extends PhraseSuggestorProps> extends Component<
  T,
  PhraseSuggestorState
> {
  public state: PhraseSuggestorState = {
    suggestions: [],
    isLoading: false,
  };

  public componentDidMount() {
    this.updateSuggestions();
  }

  protected isSuggestingValues() {
    const shouldSuggestValues = config.get('filterEditor:suggestValues');
    const { field } = this.props;
    return shouldSuggestValues && field && field.aggregatable && field.type === 'string';
  }

  protected onSearchChange = (value: string | number | boolean) => {
    this.updateSuggestions(`${value}`);
  };

  protected async updateSuggestions(value: string = '') {
    const { indexPattern, field } = this.props as PhraseSuggestorProps;
    if (!field || !this.isSuggestingValues()) {
      return;
    }
    this.setState({ isLoading: true });
    const suggestions = await getSuggestions(indexPattern.title, field, value);
    this.setState({ suggestions, isLoading: false });
  }
}
