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

import {
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { IIndexPattern } from '../..';
import { getDisplayValueFromFilter, Filter } from '../../../common';
import { FilterLabel } from '../filter_bar';
import { mapAndFlattenFilters } from '../../query';

interface Props {
  filters: Filter[];
  indexPatterns: IIndexPattern[];
  onCancel: () => void;
  onSubmit: (filters: Filter[]) => void;
}

interface State {
  isFilterSelected: boolean[];
}

export class ApplyFiltersPopoverContent extends Component<Props, State> {
  public static defaultProps = {
    filters: [],
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      isFilterSelected: props.filters.map(() => true),
    };
  }
  private getLabel(filter: Filter) {
    const valueLabel = getDisplayValueFromFilter(filter, this.props.indexPatterns);
    return <FilterLabel filter={filter} valueLabel={valueLabel} />;
  }

  public render() {
    if (this.props.filters.length === 0) {
      return '';
    }

    const mappedFilters = mapAndFlattenFilters(this.props.filters);

    const form = (
      <EuiForm>
        {mappedFilters.map((filter, i) => (
          <EuiFormRow key={i}>
            <EuiSwitch
              label={this.getLabel(filter)}
              checked={this.isFilterSelected(i)}
              onChange={() => this.toggleFilterSelected(i)}
            />
          </EuiFormRow>
        ))}
      </EuiForm>
    );

    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="data.filter.applyFilters.popupHeader"
              defaultMessage="Select filters to apply"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{form}</EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={this.props.onCancel}>
            <FormattedMessage
              id="data.filter.applyFiltersPopup.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
          <EuiButton onClick={this.onSubmit} data-test-subj="applyFiltersPopoverButton" fill>
            <FormattedMessage
              id="data.filter.applyFiltersPopup.saveButtonLabel"
              defaultMessage="Apply"
            />
          </EuiButton>
        </EuiModalFooter>
      </React.Fragment>
    );
  }

  private isFilterSelected = (i: number) => {
    return this.state.isFilterSelected[i];
  };

  private toggleFilterSelected = (i: number) => {
    const isFilterSelected = [...this.state.isFilterSelected];
    isFilterSelected[i] = !isFilterSelected[i];
    this.setState({ isFilterSelected });
  };

  private onSubmit = () => {
    const selectedFilters = this.props.filters.filter(
      (filter, i) => this.state.isFilterSelected[i]
    );
    this.props.onSubmit(selectedFilters);
  };
}
