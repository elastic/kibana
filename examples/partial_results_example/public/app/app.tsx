/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useState } from 'react';
import { pluck } from 'rxjs';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiCodeBlock,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { ExpressionsContext } from './expressions_context';

const expression = `getEvents
  | mapColumn name="Count" expression={
      countEvent {pluck "event"}
    }
`;

export function App() {
  const expressions = useContext(ExpressionsContext);
  const [datatable, setDatatable] = useState<Datatable>();

  useEffect(() => {
    const subscription = expressions
      ?.execute<null, Datatable>(expression, null, { partial: true })
      .getData()
      .pipe(pluck('result'))
      .subscribe((value) => setDatatable(value as Datatable));

    return () => subscription?.unsubscribe();
  }, [expressions]);

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header pageTitle="Partial Results Demo" />
      <EuiPageTemplate.Section>
        <EuiText data-test-subj="example-help">
          <p>
            This example listens for the window events and adds them to the table along with a
            trigger counter.
          </p>
        </EuiText>
        <EuiSpacer size={'m'} />
        <EuiCodeBlock>{expression}</EuiCodeBlock>
        <EuiSpacer size={'m'} />
        {datatable ? (
          <EuiBasicTable
            data-test-subj={'example-table'}
            columns={datatable.columns?.map(({ id: field, name }) => ({
              field,
              name,
              'data-test-subj': `example-column-${field.toLowerCase()}`,
            }))}
            items={datatable.rows ?? []}
          />
        ) : (
          <EuiCallOut color="success">
            <p>Click or press any key.</p>
          </EuiCallOut>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
