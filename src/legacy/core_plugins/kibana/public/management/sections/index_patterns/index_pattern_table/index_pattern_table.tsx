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
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { CreateButton } from '../create_button';
import { IndexPattern, IndexPatternCreationOption } from '../types';

const columns = [
  {
    field: 'title',
    name: 'Pattern',
    render: (
      name: string,
      index: {
        id: string;
        tags?: Array<{
          key: string;
          name: string;
        }>;
      }
    ) => (
      <EuiButtonEmpty size="xs" href={`#/management/kibana/index_patterns/${index.id}`}>
        {name}
        {index.tags &&
          index.tags.map(({ key: tagKey, name: tagName }) => (
            <EuiBadge className="indexPatternList__badge" key={tagKey}>
              {tagName}
            </EuiBadge>
          ))}
      </EuiButtonEmpty>
    ),
    dataType: 'string' as const,
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
    direction: 'asc' as const,
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

export const IndexPatternTable: React.FunctionComponent<Props> = ({
  indexPatterns,
  indexPatternCreationOptions,
}) => {
  return (
    <EuiPageContent data-test-subj="indexPatternTable">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false} className="euiIEFlexWrapFix">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="kbn.management.indexPatternTable.title"
                    defaultMessage="Index patterns"
                  />
                </h2>
              </EuiTitle>
              <EuiText size="s" grow={false}>
                <p>
                  Kibana requires an index pattern to identify which indices you want to explore. An
                  index pattern can point to a specific index, for example, your log data from
                  yesterday, or all indices that contain your log data.{' '}
                  <EuiLink>
                    Read documentation <EuiIcon type="popout" size="s" />
                  </EuiLink>
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CreateButton options={indexPatternCreationOptions}>
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
        items={indexPatterns}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        search={search}
      />
    </EuiPageContent>
  );
};
