/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { KeyValueTable } from '.';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

function getKeys(output: ReturnType<typeof render>) {
  const keys = output.getAllByTestId('dot-key');
  return Array.isArray(keys) ? keys.map((node) => node.textContent) : [];
}

function getValues(output: ReturnType<typeof render>) {
  const values = output.getAllByTestId('value');
  return Array.isArray(values) ? values.map((node) => node.textContent) : [];
}

describe('KeyValueTable', () => {
  it('displays key and value table', () => {
    const data = [
      { key: 'name.first', value: 'First Name' },
      { key: 'name.last', value: 'Last Name' },
      { key: 'age', value: '29' },
      { key: 'active', value: true },
      { key: 'useless', value: false },
      { key: 'start', value: null },
      { key: 'end', value: undefined },
      { key: 'nested.b.c', value: 'ccc' },
      { key: 'nested.a', value: 'aaa' },
    ];
    const output = render(
      <EuiThemeProvider>
        <KeyValueTable keyValuePairs={data} />
      </EuiThemeProvider>
    );
    const rows = output.container.querySelectorAll('tr');
    expect(rows.length).toEqual(9);

    expect(getKeys(output)).toEqual([
      'name.first',
      'name.last',
      'age',
      'active',
      'useless',
      'start',
      'end',
      'nested.b.c',
      'nested.a',
    ]);

    expect(getValues(output)).toEqual([
      'First Name',
      'Last Name',
      '29',
      'true',
      'false',
      'N/A',
      'N/A',
      'ccc',
      'aaa',
    ]);
  });
});
