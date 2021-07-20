/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiIcon, EuiNotificationBadge, EuiSelectableOption } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
import { Embeddable } from '../../../../../../embeddable/public';
import {
  InputControlEmbeddable,
  InputControlInput,
  InputControlOutput,
} from '../../embeddable/types';
import { OptionsListPopover } from './options_list_popover_component';

export type OptionsListDataFetcher = (props: {
  field: string;
  indexPattern: string;
  filters: InputControlInput['filters'];
  query: InputControlInput['query'];
  timeRange: InputControlInput['timeRange'];
}) => Promise<EuiSelectableOption[]>;

export const OPTIONS_LIST_CONTROL = 'optionsListControl';

export interface OptionsListEmbeddableInput extends InputControlInput {
  field: string;
  indexPattern: string;
  multiSelect: boolean;
  selectedItems?: string[];
}

export class OptionsListEmbeddable
  extends Embeddable<OptionsListEmbeddableInput, InputControlOutput>
  implements InputControlEmbeddable {
  public readonly type = OPTIONS_LIST_CONTROL;

  private node?: HTMLElement;
  private availableOptions: EuiSelectableOption[] = [];

  constructor(
    input: OptionsListEmbeddableInput,
    output: InputControlOutput,
    fetchData: OptionsListDataFetcher
  ) {
    super(input, output);

    const { filters, query, timeRange } = input;
    fetchData({
      indexPattern: input.indexPattern,
      field: input.field,
      timeRange,
      filters,
      query,
    }).then((newData) => (this.availableOptions = newData));
    // TODO: Refetch whenever filters, query, or timeRange changes.
  }

  reload = () => {};

  public updateItem(index: number) {
    if (!this.availableOptions[index]) {
      return;
    }
    const newItems = [...this.availableOptions];
    newItems[index].checked = newItems[index].checked === 'on' ? undefined : 'on';
    this.availableOptions = newItems;
  }

  public getPopover = () => {
    return <OptionsListPopover availableOptions={this.availableOptions} />;
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    const { selectedItems } = this.getInput();

    ReactDOM.render(
      <>
        <span
          className={classNames('optionsList--selections', {
            'optionsList--selectionsEmpty': !selectedItems?.length,
          })}
        >
          {!selectedItems?.length ? 'Select...' : selectedItems.join(', ')}
        </span>

        <span
          className="optionsList--notification"
          style={{
            visibility: selectedItems?.length && selectedItems.length > 1 ? 'visible' : 'hidden',
          }}
        >
          <EuiNotificationBadge size={'m'} color="subdued">
            {selectedItems?.length}
          </EuiNotificationBadge>
        </span>

        <span className="optionsList--notification">
          <EuiIcon type={'arrowDown'} />
        </span>
      </>,
      node
    );
  };
}
