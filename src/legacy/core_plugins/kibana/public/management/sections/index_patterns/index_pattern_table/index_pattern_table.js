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
  EuiIcon,
  EuiButtonEmpty,
  EuiInMemoryTable,
  EuiIconTip,
} from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

const columns = [
  {
    field: 'title',
    name: 'Pattern',
    //name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.nameHeader', defaultMessage: 'Name' }),
    render: (name, { id }) => (<EuiButtonEmpty size="xs" href={`#/management/kibana/indices/${id}`}>${name}</EuiButtonEmpty>),
    dataType: 'string',
    sortable: true,
  },
  {
    field: 'id',
    name: 'id',
    //name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.nameHeader', defaultMessage: 'Name' }),
    dataType: 'string',
    sortable: true,
  },
];

const pagination = {
  initialPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50]
};

const Table = ({
  indexPatterns
}) => (
  <EuiInMemoryTable
    items={indexPatterns}
    columns={columns}
    pagination={pagination}
    sorting={true}
  />
);

export const IndexPatternTable = injectI18n(Table);
//