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

import * as React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { DoubleIntegers } from '../../../../components/double_integers';
import { Page } from '../../../../components/page';
import { useDeps } from '../../../../hooks/use_deps';

// eslint-disable-next-line
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
