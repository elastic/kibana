/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { merge, Subject } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { EuiSelectableOption } from '@elastic/eui';
import { tap, debounceTime, map, distinctUntilChanged } from 'rxjs/operators';

import { esFilters } from '../../../../../../data/public';
import { OptionsListStrings } from './options_list_strings';
import { Embeddable, IContainer } from '../../../../../../embeddable/public';
import { InputControlInput, InputControlOutput } from '../../types';
import { OptionsListComponent, OptionsListComponentState } from './options_list_component';

const toggleAvailableOptions = (
  indices: number[],
  availableOptions: EuiSelectableOption[],
  enabled?: boolean
) => {
  const newAvailableOptions = [...availableOptions];
  indices.forEach((index) => (newAvailableOptions[index].checked = enabled ? 'on' : undefined));
  return newAvailableOptions;
};

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
  field: string;
  search?: string;
  indexPattern: string;
  query?: InputControlInput['query'];
  filters?: InputControlInput['filters'];
  timeRange?: InputControlInput['timeRange'];
}

export type OptionsListIndexPatternFetcher = () => Promise<string[]>; // TODO: use the proper types here.
export type OptionsListFieldFetcher = (indexPattern: string) => Promise<string[]>; // TODO: use the proper types here.

export type OptionsListDataFetcher = (
  props: OptionsListDataFetchProps
) => Promise<EuiSelectableOption[]>;

export const OPTIONS_LIST_CONTROL = 'optionsListControl';
export interface OptionsListEmbeddableInput extends InputControlInput {
  field: string;
  indexPattern: string;
  singleSelect?: boolean;
  defaultSelections?: string[];
}
export class OptionsListEmbeddable extends Embeddable<
  OptionsListEmbeddableInput,
  InputControlOutput
> {
  public readonly type = OPTIONS_LIST_CONTROL;
  private node?: HTMLElement;

  // internal state for this input control.
  private selectedOptions: Set<string>;
  private typeaheadSubject: Subject<string> = new Subject<string>();

  private componentState: OptionsListComponentState;
  private componentStateSubject$ = new Subject<OptionsListComponentState>();
  private updateComponentState(changes: Partial<OptionsListComponentState>) {
    this.componentState = {
      ...this.componentState,
      ...changes,
    };
    this.componentStateSubject$.next(this.componentState);
  }

  constructor(
    input: OptionsListEmbeddableInput,
    output: InputControlOutput,
    private fetchData: OptionsListDataFetcher,
    parent?: IContainer
  ) {
    super(input, output, parent);
    this.fetchData = fetchData;

    // populate default selections from input
    this.selectedOptions = new Set<string>(input.defaultSelections ?? []);
    const { selectedOptionsCount, selectedOptionsString } = this.buildSelectedOptionsString();

    // fetch available options when input changes or when search string has changed
    const typeaheadPipe = this.typeaheadSubject.pipe(
      tap((newSearchString) => this.updateComponentState({ searchString: newSearchString })),
      debounceTime(100)
    );
    const inputPipe = this.getInput$().pipe(
      map(
        (newInput) => ({
          field: newInput.field,
          indexPattern: newInput.indexPattern,
          query: newInput.query,
          filters: newInput.filters,
          timeRange: newInput.timeRange,
        }),
        distinctUntilChanged(diffDataFetchProps)
      )
    );
    merge(typeaheadPipe, inputPipe).subscribe(this.fetchAvailableOptions);

    // push changes from input into component state
    this.getInput$().subscribe((newInput) => {
      if (newInput.twoLineLayout !== this.componentState.twoLineLayout)
        this.updateComponentState({ twoLineLayout: newInput.twoLineLayout });
    });

    this.componentState = {
      loading: true,
      selectedOptionsCount,
      selectedOptionsString,
      twoLineLayout: input.twoLineLayout,
    };
    this.updateComponentState(this.componentState);
  }

  private fetchAvailableOptions = async () => {
    this.updateComponentState({ loading: true });

    const { indexPattern, timeRange, filters, field, query } = this.getInput();
    let newOptions = await this.fetchData({
      search: this.componentState.searchString,
      indexPattern,
      timeRange,
      filters,
      field,
      query,
    });

    // We now have new 'availableOptions', we need to ensure the selected options are still selected in the new list.
    const enabledIndices: number[] = [];
    this.selectedOptions?.forEach((selectedOption) => {
      const optionIndex = newOptions.findIndex(
        (availableOption) => availableOption.label === selectedOption
      );
      if (optionIndex >= 0) enabledIndices.push(optionIndex);
    });
    newOptions = toggleAvailableOptions(enabledIndices, newOptions, true);
    this.updateComponentState({ loading: false, availableOptions: newOptions });
  };

  private updateOption = (index: number) => {
    const item = this.componentState.availableOptions?.[index];
    if (!item) return;
    const toggleOff = item.checked === 'on';

    // update availableOptions to show selection check marks
    const newAvailableOptions = toggleAvailableOptions(
      [index],
      this.componentState.availableOptions ?? [],
      !toggleOff
    );
    this.componentState.availableOptions = newAvailableOptions;

    // update selectedOptions string
    if (toggleOff) this.selectedOptions.delete(item.label);
    else this.selectedOptions.add(item.label);
    const { selectedOptionsString, selectedOptionsCount } = this.buildSelectedOptionsString();
    this.updateComponentState({ selectedOptionsString, selectedOptionsCount });
  };

  private buildSelectedOptionsString(): {
    selectedOptionsString: string;
    selectedOptionsCount: number;
  } {
    const selectedOptionsArray = Array.from(this.selectedOptions ?? []);
    const selectedOptionsString = selectedOptionsArray.join(
      OptionsListStrings.summary.getSeparator()
    );
    const selectedOptionsCount = selectedOptionsArray.length;
    return { selectedOptionsString, selectedOptionsCount };
  }

  reload = () => {
    this.fetchAvailableOptions();
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(
      <OptionsListComponent
        updateOption={this.updateOption}
        typeaheadSubject={this.typeaheadSubject}
        componentStateSubject={this.componentStateSubject$}
      />,
      node
    );
  };
}
