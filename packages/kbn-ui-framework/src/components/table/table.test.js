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
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTable } from './table';
import { KuiTableRow } from './table_row';
import { KuiTableRowCell } from './table_row_cell';
import { KuiTableBody } from './table_body';
import { KuiTableHeader } from './table_header';
import { KuiTableHeaderCell } from './table_header_cell';

test('renders KuiTable', () => {
  const component = (
    <KuiTable {...requiredProps}>
      <KuiTableHeader>
        <KuiTableHeaderCell>Hi Title</KuiTableHeaderCell>
        <KuiTableHeaderCell>Bye Title</KuiTableHeaderCell>
      </KuiTableHeader>
      <KuiTableBody>
        <KuiTableRow>
          <KuiTableRowCell>Hi</KuiTableRowCell>
        </KuiTableRow>
        <KuiTableRow>
          <KuiTableRowCell>Bye</KuiTableRowCell>
        </KuiTableRow>
      </KuiTableBody>
    </KuiTable>
  );
  expect(render(component)).toMatchSnapshot();
});
