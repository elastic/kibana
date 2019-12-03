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
import React, { Component } from 'react';

import {
  EuiLoadingSpinner,
  EuiButton,
  EuiFormRow,
  EuiFlexGroup,
  EuiSpacer,
  EuiFlexItem,
  EuiFieldText,
  EuiPanel,
  EuiCheckbox,
} from '@elastic/eui';
import {
  withEmbeddableSubscription,
  ContainerOutput,
} from '../../../../src/plugins/embeddable/public';
import { EmbeddableListItem } from '../list_container/embeddable_list_item';
import { SearchableListContainer, SearchableContainerInput } from './searchable_list_container';

interface Props {
  embeddable: SearchableListContainer;
  input: SearchableContainerInput;
  output: ContainerOutput;
}

interface State {
  checked: { [key: string]: boolean };
}

export class SearchableListContainerComponentInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const checked: { [id: string]: boolean } = {};
    props.embeddable.getChildIds().forEach(id => (checked[id] = false));
    this.state = {
      checked,
    };
  }

  private updateFilter = (filter: string) => {
    this.props.embeddable.updateInput({ filter });
  };

  private deleteChecked = () => {
    Object.values(this.props.input.panels).map(panel => {
      if (this.state.checked[panel.explicitInput.id]) {
        this.props.embeddable.removeEmbeddable(panel.explicitInput.id);
      }
    });
  };

  private toggleCheck = (isChecked: boolean, id: string) => {
    this.setState(prevState => ({ checked: { ...prevState.checked, [id]: isChecked } }));
  };

  public renderControls() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton data-test-subj="deleteCheckedTodos" onClick={() => this.deleteChecked()}>
              Delete checked
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Filter">
            <EuiFieldText
              data-test-subj="filterTodos"
              value={this.props.input.filter || ''}
              onChange={ev => this.updateFilter(ev.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    );
  }

  public render() {
    const { embeddable } = this.props;
    return (
      <div>
        <h2 data-test-subj="searchableListContainerTitle">{embeddable.getTitle()}</h2>
        <EuiSpacer size="l" />
        {this.renderControls()}
        <EuiSpacer size="l" />
        {this.renderList()}
      </div>
    );
  }

  private renderList() {
    let id = 0;
    const list = Object.values(this.props.input.panels).map(panel => {
      const embeddable = this.props.embeddable.getChild(panel.explicitInput.id);
      id++;
      return embeddable ? (
        <EuiPanel key={embeddable.id}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                data-test-subj={`todoCheckBox-${embeddable.id}`}
                disabled={!embeddable}
                id={embeddable ? embeddable.id : ''}
                checked={this.state.checked[embeddable.id]}
                onChange={e => this.toggleCheck(e.target.checked, embeddable.id)}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EmbeddableListItem embeddable={embeddable} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ) : (
        <EuiLoadingSpinner size="l" key={id} />
      );
    });
    return list;
  }
}

export const SearchableListContainerComponent = withEmbeddableSubscription(
  SearchableListContainerComponentInner
);
