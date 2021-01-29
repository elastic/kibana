/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { debounce } from 'lodash';

import { withKibana, KibanaReactContextValue } from '../../../../../kibana_react/public';
import { IDataPluginServices, IIndexPattern, IFieldType } from '../../..';
import { UI_SETTINGS } from '../../../../common';

export interface PhraseSuggestorProps {
  kibana: KibanaReactContextValue<IDataPluginServices>;
  indexPattern: IIndexPattern;
  field?: IFieldType;
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
export class PhraseSuggestorUI<T extends PhraseSuggestorProps> extends React.Component<
  T,
  PhraseSuggestorState
> {
  private services = this.props.kibana.services;
  private abortController?: AbortController;
  public state: PhraseSuggestorState = {
    suggestions: [],
    isLoading: false,
  };

  public componentDidMount() {
    this.updateSuggestions();
  }

  public componentWillUnmount() {
    if (this.abortController) this.abortController.abort();
  }

  protected isSuggestingValues() {
    const shouldSuggestValues = this.services.uiSettings.get(
      UI_SETTINGS.FILTERS_EDITOR_SUGGEST_VALUES
    );
    const { field } = this.props;
    return shouldSuggestValues && field && field.aggregatable && field.type === 'string';
  }

  protected onSearchChange = (value: string | number | boolean) => {
    this.updateSuggestions(`${value}`);
  };

  protected updateSuggestions = debounce(async (query: string = '') => {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    const { indexPattern, field } = this.props as PhraseSuggestorProps;
    if (!field || !this.isSuggestingValues()) {
      return;
    }
    this.setState({ isLoading: true });

    const suggestions = await this.services.data.autocomplete.getValueSuggestions({
      indexPattern,
      field,
      query,
      signal: this.abortController.signal,
      // Show all results in filter bar autocomplete
      useTimeRange: false,
    });

    this.setState({ suggestions, isLoading: false });
  }, 500);
}

export const PhraseSuggestor = withKibana(PhraseSuggestorUI as any);
