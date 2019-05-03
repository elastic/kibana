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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSwitch,
} from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { getFilterDisplayText } from '../filter_bar/filter_view';

interface Props {
  filters: Filter[];
  onCancel: () => void;
  onSubmit: (filters: Filter[]) => void;
}

interface State {
  isFilterSelected: boolean[];
}

export class ApplyFiltersPopover extends Component<Props, State> {
  public static defaultProps = {
    filters: [],
  };

  public constructor(props: Props) {
    super(props);
    this.state = {
      isFilterSelected: props.filters.map(() => true),
    };
  }

  public render() {
    if (this.props.filters.length === 0) {
      return '';
    }

    const form = (
      <EuiForm>
        {this.props.filters.map((filter, i) => (
          <EuiFormRow key={i}>
            <EuiSwitch
              label={getFilterDisplayText(filter)}
              checked={this.isFilterSelected(i)}
              onChange={() => this.toggleFilterSelected(i)}
            />
          </EuiFormRow>
        ))}
      </EuiForm>
    );

    return (
      <EuiOverlayMask>
        <EuiModal onClose={this.props.onCancel}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="common.ui.applyFilters.popupHeader"
                defaultMessage="Select filters to apply"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>{form}</EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={this.props.onCancel}>
              <FormattedMessage
                id="common.ui.applyFiltersPopup.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
            <EuiButton onClick={this.onSubmit} fill>
              <FormattedMessage
                id="common.ui.applyFiltersPopup.saveButtonLabel"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
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
