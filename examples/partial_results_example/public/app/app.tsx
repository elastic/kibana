/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useState } from 'react';
import { pluck } from 'rxjs/operators';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiCodeBlock,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin';
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
      ?.execute<null, Datatable>(expression, null)
      .getData()
      .pipe(pluck('result'))
      .subscribe((value) => setDatatable(value as Datatable));

    return () => subscription?.unsubscribe();
  }, [expressions]);

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Partial Results Demo</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 800, margin: '0 auto' }}>
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
                textOnly={true}
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
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
