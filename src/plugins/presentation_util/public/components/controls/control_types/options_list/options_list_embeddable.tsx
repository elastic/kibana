/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import deepEqual from 'fast-deep-equal';
import { merge, Subject, Subscription } from 'rxjs';
import { tap, debounceTime, map, distinctUntilChanged, skip } from 'rxjs/operators';

import { isEqual } from 'lodash';
import { ReduxEmbeddableWrapper } from '../../../redux_embeddables/redux_embeddable_wrapper';
import { InputControlInput, InputControlOutput } from '../../../../services/controls';
import { esFilters, IIndexPattern, IFieldType } from '../../../../../../data/public';
import { Embeddable, IContainer } from '../../../../../../embeddable/public';
import { OptionsListComponent, OptionsListComponentState } from './options_list_component';
import { optionsListReducers } from './options_list_reducers';

const diffDataFetchProps = (
  current?: OptionsListDataFetchProps,
  last?: OptionsListDataFetchProps
) => {
  if (!current || !last) return false;
  const { filters: currentFilters, ...currentWithoutFilters } = current;
  const { filters: lastFilters, ...lastWithoutFilters } = last;
  if (!deepEqual(currentWithoutFilters, lastWithoutFilters)) return false;
  if (!esFilters.compareFilters(lastFilters ?? [], currentFilters ?? [])) return false;
  return true;
};

interface OptionsListDataFetchProps {
  search?: string;
  field: IFieldType;
  indexPattern: IIndexPattern;
  query?: InputControlInput['query'];
  filters?: InputControlInput['filters'];
  timeRange?: InputControlInput['timeRange'];
}

export type OptionsListIndexPatternFetcher = () => Promise<IIndexPattern[]>;
export type OptionsListFieldFetcher = (indexPattern: IIndexPattern) => Promise<IFieldType[]>;

export type OptionsListDataFetcher = (props: OptionsListDataFetchProps) => Promise<string[]>;

export const OPTIONS_LIST_CONTROL = 'optionsListControl';
export interface OptionsListEmbeddableInput extends InputControlInput {
  field: IFieldType;
  indexPattern: IIndexPattern;

  selectedOptions?: string[];
  singleSelect?: boolean;
  loading?: boolean;
}

export class OptionsListEmbeddable extends Embeddable<
  OptionsListEmbeddableInput,
  InputControlOutput
> {
  public readonly type = OPTIONS_LIST_CONTROL;
  private node?: HTMLElement;

  // internal state for this input control.
  private typeaheadSubject: Subject<string> = new Subject<string>();
  private searchString = '';

  private componentState: OptionsListComponentState;
  private componentStateSubject$ = new Subject<OptionsListComponentState>();
  private updateComponentState(changes: Partial<OptionsListComponentState>) {
    this.componentState = {
      ...this.componentState,
      ...changes,
    };
    this.componentStateSubject$.next(this.componentState);
  }

  private subscriptions: Subscription = new Subscription();

  constructor(
    input: OptionsListEmbeddableInput,
    output: InputControlOutput,
    private fetchData: OptionsListDataFetcher,
    parent?: IContainer
  ) {
    super({ ...input, loading: true }, output, parent);
    this.fetchData = fetchData;

    const dataFetchPipe = this.getInput$().pipe(
      map((newInput) => ({
        field: newInput.field,
        indexPattern: newInput.indexPattern,
        query: newInput.query,
        filters: newInput.filters,
        timeRange: newInput.timeRange,
      })),
      distinctUntilChanged(diffDataFetchProps)
    );

    // push searchString changes into a debounced typeahead subject
    this.typeaheadSubject = new Subject<string>();
    const typeaheadPipe = this.typeaheadSubject.pipe(
      tap((newSearchString) => (this.searchString = newSearchString), debounceTime(100))
    );

    // fetch available options when input changes or when search string has changed
    this.subscriptions.add(
      merge(dataFetchPipe, typeaheadPipe).subscribe(this.fetchAvailableOptions)
    );

    // clear all selections when field or index pattern change
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          distinctUntilChanged(
            (a, b) => isEqual(a.field, b.field) && isEqual(a.indexPattern, b.indexPattern)
          ),
          skip(1) // skip the first change to preserve default selections after init
        )
        .subscribe(() => this.updateInput({ selectedOptions: [] }))
    );

    this.componentState = { loading: true };
    this.updateComponentState(this.componentState);
  }

  private fetchAvailableOptions = async () => {
    this.updateComponentState({ loading: true });
    const { indexPattern, timeRange, filters, field, query } = this.getInput();
    const newOptions = await this.fetchData({
      search: this.searchString,
      indexPattern,
      timeRange,
      filters,
      field,
      query,
    });
    this.updateComponentState({ availableOptions: newOptions, loading: false });
  };

  public destroy = () => {
    super.destroy();
    this.subscriptions.unsubscribe();
  };

  reload = () => {
    this.fetchAvailableOptions();
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(
      <ReduxEmbeddableWrapper<OptionsListEmbeddableInput>
        embeddable={this}
        reducers={optionsListReducers}
      >
        <OptionsListComponent
          componentStateSubject={this.componentStateSubject$}
          typeaheadSubject={this.typeaheadSubject}
        />
      </ReduxEmbeddableWrapper>,
      node
    );
  };
}
