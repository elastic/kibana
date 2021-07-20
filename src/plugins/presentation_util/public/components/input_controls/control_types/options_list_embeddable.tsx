/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFieldSearch,
  EuiFilterSelectItem,
  EuiIcon,
  EuiLoadingChart,
  EuiNotificationBadge,
  EuiPopoverTitle,
  EuiSpacer,
  FilterChecked,
} from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
import { Embeddable } from '../../../../../embeddable/public';
import { InputControlEmbeddable, InputControlInput, InputControlOutput } from '../embeddable/types';

export type OptionsListDataFetcher = (props: {
  field: string;
  indexPattern: string;
  filters: InputControlInput['filters'];
  query: InputControlInput['query'];
  timeRange: InputControlInput['timeRange'];
}) => Promise<string[]>;

interface OptionsListAvailableItem {
  checked?: FilterChecked;
  label: string;
}

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
  private availableOptions: OptionsListAvailableItem[] = [];

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
    }).then((newData) => (this.availableOptions = newData.map((label) => ({ label }))));
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
    const loading = (
      <div className="euiFilterSelect__note">
        <div className="euiFilterSelect__noteContent">
          <EuiLoadingChart size="m" />
          <EuiSpacer size="xs" />
          <p>Loading filters</p>
        </div>
      </div>
    );

    const searchBar = (
      <EuiPopoverTitle paddingSize="s">
        <EuiFieldSearch compressed />
      </EuiPopoverTitle>
    );

    return this.availableOptions ? (
      <>
        {searchBar}
        <div className="optionsList--items">
          {this.availableOptions.map((item, index) => (
            <EuiFilterSelectItem checked={item.checked} key={index} onClick={() => {}}>
              {item.label}
            </EuiFilterSelectItem>
          ))}
        </div>
      </>
    ) : (
      loading
    );
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
