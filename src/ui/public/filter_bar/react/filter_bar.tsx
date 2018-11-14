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

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';
import React, { Component } from 'react';
import { MetaFilter } from 'ui/filter_bar/filters/meta_filter';
import { FilterItem } from 'ui/filter_bar/react/filter_item';

interface Props {
  filters: MetaFilter[];
  onToggleNegate: (filter: MetaFilter) => void;
  onToggleDisabled: (filter: MetaFilter) => void;
  onTogglePin: (filter: MetaFilter) => void;
  onDelete: (filter: MetaFilter) => void;
}

export class FilterBar extends Component<Props> {
  public onToggleNegate = (filter: MetaFilter) => {
    this.props.onToggleNegate(filter);
  };

  public onTogglePin = (filter: MetaFilter) => {
    this.props.onTogglePin(filter);
  };

  public onToggleDisabled = (filter: MetaFilter) => {
    this.props.onToggleDisabled(filter);
  };

  public onDelete = (filter: MetaFilter) => {
    this.props.onDelete(filter);
  };

  public render() {
    const filterItems = this.props.filters.map(filter => {
      return (
        <EuiFlexItem grow={false}>
          <FilterItem
            filter={filter}
            onToggleNegate={this.onToggleNegate}
            onToggleDisabled={this.onToggleDisabled}
            onTogglePin={this.onTogglePin}
            onDelete={this.onDelete}
          />
        </EuiFlexItem>
      );
    });

    const classes = classNames('globalFilterGroup__wrapper', {
      'globalFilterGroup__wrapper-isVisible': true,
    });

    return (
      <div
        id="GlobalFilterGroup"
        // ref={node => {
        //   this.filterBarWrapper = node;
        // }}
        className={classes}
      >
        <div>
          <EuiFlexGroup
            className="globalFilterGroup"
            gutterSize="none"
            alignItems="flexStart"
            responsive={false}
          >
            {/*<EuiFlexItem className="globalFilterGroup__branch" grow={false}>*/}
            {/*<GlobalFilterOptions />*/}
            {/*</EuiFlexItem>*/}

            <EuiFlexItem>
              <EuiFlexGroup
                className="globalFilterGroup__filterBar globalFilterBar"
                wrap={true}
                responsive={false}
                gutterSize="xs"
                alignItems="center"
              >
                {filterItems}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }
}
