/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSelectableOption } from '@elastic/eui';
import { deepEqual } from '@hapi/hoek';
import { isEqual } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { esFilters } from '../../../../../../data/public';
import { Embeddable } from '../../../../../../embeddable/public';
import {
  InputControlEmbeddable,
  InputControlInput,
  InputControlOutput,
} from '../../embeddable/types';
import { OptionsListPopover } from './options_list_popover_component';
import { OptionsListSummary } from './options_list_summary_component';

interface OptionsListDataFetchProps {
  field: string;
  indexPattern: string;
  query: InputControlInput['query'];
  filters: InputControlInput['filters'];
  timeRange: InputControlInput['timeRange'];

  search?: string;
}

export type OptionsListDataFetcher = (
  props: OptionsListDataFetchProps
) => Promise<EuiSelectableOption[]>;

export const OPTIONS_LIST_CONTROL = 'optionsListControl';
export interface OptionsListEmbeddableInput extends InputControlInput {
  field: string;
  search: string;
  indexPattern: string;
  multiSelect: boolean;
  selectedItems?: string[];
  availableOptions?: EuiSelectableOption[];
}

export class OptionsListEmbeddable
  extends Embeddable<OptionsListEmbeddableInput, InputControlOutput>
  implements InputControlEmbeddable {
  public readonly type = OPTIONS_LIST_CONTROL;

  private node?: HTMLElement;

  // save a copy of the last dataFetchProps for diffing
  private lastDataFetchProps?: OptionsListDataFetchProps;

  private diffDataFetchProps = (
    current?: OptionsListDataFetchProps,
    last?: OptionsListDataFetchProps
  ) => {
    if (!current || !last) return true;
    const { filters: currentFilters, ...currentWithoutFilters } = current;
    const { filters: lastFilters, ...lastWithoutFilters } = last;
    if (!deepEqual(currentWithoutFilters, lastWithoutFilters)) return true;
    if (!esFilters.compareFilters(lastFilters ?? [], currentFilters ?? [])) return true;
    return false;
  };

  constructor(
    input: OptionsListEmbeddableInput,
    output: InputControlOutput,
    fetchData: OptionsListDataFetcher
  ) {
    super(input, output);

    const refreshData = () => {
      const { filters, query, timeRange, indexPattern, field, search } = this.input;
      const currentDataFetchProps = { filters, query, timeRange, indexPattern, field, search };
      if (this.diffDataFetchProps(currentDataFetchProps, this.lastDataFetchProps)) {
        this.lastDataFetchProps = currentDataFetchProps;
        this.updateOutput({ loading: true });
        fetchData({
          indexPattern,
          timeRange,
          filters,
          field,
          query,
          search,
        }).then((newOptions) => {
          this.updateInput({ availableOptions: newOptions });
          this.updateOutput({ loading: false });
        });
      }
    };

    this.getInput$().subscribe(() => refreshData());
    refreshData();
  }

  reload = () => {};

  public getPopover = () => {
    return <OptionsListPopover embeddable={this} />;
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(<OptionsListSummary embeddable={this} />, node);
  };
}
