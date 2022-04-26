/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  EuiCheckbox,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';
import { getDisplayValueFromFilter, mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { Filter } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import { FilterLabel } from '../filter_bar';

interface Props {
  filters: Filter[];
  indexPatterns: DataView[];
  onCancel: () => void;
  onSubmit: (filters: Filter[]) => void;
}

interface State {
  isFilterSelected: boolean[];
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default class ApplyFiltersPopoverContent extends Component<Props, State> {
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
            <EuiCheckbox
              id={`filterCheckbox-${i}`}
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
              id="unifiedSearch.filter.applyFilters.popupHeader"
              defaultMessage="Select filters to apply"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{form}</EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={this.props.onCancel}>
            <FormattedMessage
              id="unifiedSearch.filter.applyFiltersPopup.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
          <EuiButton onClick={this.onSubmit} data-test-subj="applyFiltersPopoverButton" fill>
            <FormattedMessage
              id="unifiedSearch.filter.applyFiltersPopup.saveButtonLabel"
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
