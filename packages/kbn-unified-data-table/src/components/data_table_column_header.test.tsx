/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { FieldIcon } from '@kbn/field-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import {
  createStubDataView,
  stubLogstashDataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { DataTableColumnHeader } from './data_table_column_header';

const stubDataViewWithNested = createStubDataView({
  spec: {
    id: 'index_with_nested',
    fields: {
      'nested_user.lastname': {
        name: 'nested_user.lastname',
        esTypes: ['text'],
        type: 'string',
        aggregatable: false,
        searchable: true,
        subType: {
          nested: {
            path: 'nested_user',
          },
        },
      },
      'nested_user.lastname.keyword': {
        name: 'nested_user.lastname.keyword',
        esTypes: ['keyword'],
        type: 'string',
        aggregatable: true,
        searchable: true,
        subType: {
          multi: {
            parent: 'nested_user.lastname',
          },
          nested: {
            path: 'nested_user',
          },
        },
      },
    },
    title: 'index_with_nested',
  },
});

describe('DataTableColumnHeader', function () {
  async function mountComponent(element: ReactElement) {
    const component = mountWithIntl(element);
    // wait for lazy modules
    await new Promise((resolve) => setTimeout(resolve, 0));
    component.update();

    return component;
  }
  it('should render a correct token', async () => {
    const component = await mountComponent(
      <DataTableColumnHeader
        columnName="bytes"
        columnDisplayName="bytesDisplayName"
        dataView={stubLogstashDataView}
      />
    );
    expect(component.text()).toBe('NumberbytesDisplayName');
    expect(component.find(FieldIcon).first().prop('type')).toBe('number');
  });

  it('should render a correct token for a custom column type (in case of text-based queries)', async () => {
    const component = await mountComponent(
      <DataTableColumnHeader
        columnName="bytes"
        columnDisplayName="bytesDisplayName"
        columnTypes={{
          bytes: 'keyword',
        }}
        dataView={stubLogstashDataView}
      />
    );
    expect(component.text()).toBe('KeywordbytesDisplayName');
    expect(component.find(FieldIcon).first().prop('type')).toBe('keyword');
  });

  it('should not render a token for Document column', async () => {
    const component = await mountComponent(
      <DataTableColumnHeader
        columnName="_source"
        columnDisplayName="Document"
        dataView={stubLogstashDataView}
      />
    );
    expect(component.text()).toBe('Document');
    expect(component.find(FieldIcon).exists()).toBe(false);
  });

  it('should render the nested icon', async () => {
    const component = await mountComponent(
      <DataTableColumnHeader
        columnName="nested_user"
        columnDisplayName="Nested User"
        dataView={stubDataViewWithNested}
      />
    );
    expect(component.text()).toBe('NestedNested User');
    expect(component.find(FieldIcon).first().prop('type')).toBe('nested');
  });
});
