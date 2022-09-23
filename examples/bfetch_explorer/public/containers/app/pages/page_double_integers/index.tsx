/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { DoubleIntegers } from '../../../../components/double_integers';
import { Page } from '../../../../components/page';
import { useDeps } from '../../../../hooks/use_deps';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Props {}

export const PageDoubleIntegers: React.FC<Props> = () => {
  const { explorer } = useDeps();

  return (
    <Page title={'Double Integers'}>
      <EuiText>
        Below is a list of numbers in milliseconds. They are sent as a batch to the server. For each
        number server waits given number of milliseconds then doubles the number and streams it
        back.
      </EuiText>
      <br />
      <EuiPanel paddingSize="l">
        <DoubleIntegers double={explorer.double} />
      </EuiPanel>
    </Page>
  );
};
