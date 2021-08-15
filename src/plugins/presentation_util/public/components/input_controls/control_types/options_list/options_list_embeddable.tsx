/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiSelectableOption } from '@elastic/eui';

import { OptionsListComponent } from './options_list_component';
import { Embeddable } from '../../../../../../embeddable/public';
import { InputControlInput, InputControlOutput } from '../../embeddable/types';

interface OptionsListDataFetchProps {
  field: string;
  search?: string;
  indexPattern: string;
  query?: InputControlInput['query'];
  filters?: InputControlInput['filters'];
  timeRange?: InputControlInput['timeRange'];
}

export type OptionsListDataFetcher = (
  props: OptionsListDataFetchProps
) => Promise<EuiSelectableOption[]>;

export const OPTIONS_LIST_CONTROL = 'optionsListControl';
export interface OptionsListEmbeddableInput extends InputControlInput {
  field: string;
  indexPattern: string;
  multiSelect: boolean;
}
export class OptionsListEmbeddable extends Embeddable<
  OptionsListEmbeddableInput,
  InputControlOutput
> {
  public readonly type = OPTIONS_LIST_CONTROL;

  private node?: HTMLElement;
  private fetchData: OptionsListDataFetcher;

  constructor(
    input: OptionsListEmbeddableInput,
    output: InputControlOutput,
    fetchData: OptionsListDataFetcher
  ) {
    super(input, output);
    this.fetchData = fetchData;
  }

  reload = () => {};

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(<OptionsListComponent embeddable={this} fetchData={this.fetchData} />, node);
  };
}
