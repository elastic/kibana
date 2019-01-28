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

import React from 'react';
import {
  EuiButtonEmpty,
  EuiInMemoryTable,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

const columns = [
  {
    field: 'title',
    name: 'Pattern',
    render: (name, { id }) => (<EuiButtonEmpty size="xs" href={`#/management/kibana/index_patterns/${id}`}>{name}</EuiButtonEmpty>),
    dataType: 'string',
    sortable: true,
  }
];

const pagination = {
  initialPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50]
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
      fields: { title: { type: 'string' } }
    }
  }
};

const Table = ({
  indexPatterns,
  navTo
}) => (
  <div>
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiText>
          <h2><FormattedMessage id="kbn.management.indexPatternTable.title" defaultMessage="Index patterns" /></h2>
          <p>
            <FormattedMessage
              id="kbn.management.indexPatternTable.subtitle"
              defaultMessage="Index patterns allow you to bucket disparate data sources together so their shared fields may be queried in
              Kibana."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem  grow={false}>
        <EuiButton
          fill
          onClick={() => {
            // console.log('euibutton hi', navTo);
            // debugger;
            navTo('/management/kibana/index_pattern');}}
        >
          <FormattedMessage id="kbn.management.indexPatternTable.createBtn" defaultMessage="Create index pattern" />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiInMemoryTable
      itemId="id"
      isSelectable={false}
      items={indexPatterns}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      search={search}
    />
  </div>
);

export const IndexPatternTable = injectI18n(Table);
