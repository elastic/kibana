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
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { CreateButton } from '../create_button';
import { CreateIndexPatternPrompt } from '../create_index_pattern_prompt';
import { IndexPattern, IndexPatternCreationOption } from '../types';

const columns = [
  {
    field: 'title',
    name: 'Pattern',
    render: (name: string, index: { id: string; default: boolean }) => (
      <EuiButtonEmpty size="xs" href={`#/management/kibana/index_patterns/${index.id}`}>
        {name}
        {index.default && <EuiBadge className="indexPatternList__badge">Default</EuiBadge>}
      </EuiButtonEmpty>
    ),
    dataType: 'string',
    sortable: ({ sort }: { sort: string }) => sort,
  },
];

const pagination = {
  initialPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50],
};

const sorting = {
  sort: {
    field: 'title',
    direction: 'asc',
  },
};

const search = {
  box: {
    incremental: true,
    schema: {
      fields: { title: { type: 'string' } },
    },
  },
};

interface Props {
  indexPatterns: IndexPattern[];
  indexPatternCreationOptions: IndexPatternCreationOption[];
}

interface State {
  showFlyout: boolean;
}

export class IndexPatternTable extends React.Component<Props, State> {
  public readonly state = {
    showFlyout: this.props.indexPatterns.length === 0,
  };

  public render() {
    return (
      <EuiPanel paddingSize="l" data-test-subj="indexPatternTable">
        {this.state.showFlyout && (
          <CreateIndexPatternPrompt onClose={() => this.setState({ showFlyout: false })} />
        )}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false} className="euiIEFlexWrapFix">
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText>
                  <h2>
                    <FormattedMessage
                      id="kbn.management.indexPatternTable.title"
                      defaultMessage="Index patterns"
                    />
                  </h2>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconSize="l"
                  iconType="questionInCircle"
                  onClick={() => this.setState({ showFlyout: true })}
                  aria-label="Help"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CreateButton options={this.props.indexPatternCreationOptions}>
              <FormattedMessage
                id="kbn.management.indexPatternTable.createBtn"
                defaultMessage="Create index pattern"
              />
            </CreateButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiInMemoryTable
          allowNeutralSort={false}
          itemId="id"
          isSelectable={false}
          items={this.props.indexPatterns}
          columns={columns}
          pagination={pagination}
          sorting={sorting}
          search={search}
        />
      </EuiPanel>
    );
  }
}
