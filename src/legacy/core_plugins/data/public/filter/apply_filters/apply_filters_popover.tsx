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

import { EuiModal, EuiOverlayMask } from '@elastic/eui';
import React, { Component } from 'react';
import { ApplyFiltersPopoverContent } from './apply_filter_popover_content';
import { IndexPattern } from '../../index_patterns/index_patterns';
import { esFilters } from '../../../../../../plugins/data/public';

interface Props {
  filters: esFilters.Filter[];
  onCancel: () => void;
  onSubmit: (filters: esFilters.Filter[]) => void;
  indexPatterns: IndexPattern[];
}

interface State {
  isFilterSelected: boolean[];
}

export class ApplyFiltersPopover extends Component<Props, State> {
  public render() {
    if (!this.props.filters || this.props.filters.length === 0) {
      return '';
    }

    return (
      <EuiOverlayMask>
        <EuiModal onClose={this.props.onCancel}>
          <ApplyFiltersPopoverContent
            filters={this.props.filters}
            onCancel={this.props.onCancel}
            onSubmit={this.props.onSubmit}
            indexPatterns={this.props.indexPatterns}
          />
        </EuiModal>
      </EuiOverlayMask>
    );
  }
}

type cancelFunction = () => void;
type submitFunction = (filters: esFilters.Filter[]) => void;
export const applyFiltersPopover = (
  filters: esFilters.Filter[],
  indexPatterns: IndexPattern[],
  onCancel: cancelFunction,
  onSubmit: submitFunction
) => {
  return (
    <ApplyFiltersPopoverContent
      indexPatterns={indexPatterns}
      filters={filters}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
};
