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
import { CountUntil } from '../../../../components/count_until';
import { Page } from '../../../../components/page';
import { useDeps } from '../../../../hooks/use_deps';

// eslint-disable-next-line
export interface Props {}

export const PageCountUntil: React.FC<Props> = () => {
  const { plugins } = useDeps();

  return (
    <Page title={'Count Until'}>
      <EuiText>
        This demo sends a single number N using <code>fetchStreaming</code> to the server. The
        server will stream back N number of messages with 1 second delay each containing a number
        from 1 to N, after which it will close the stream.
      </EuiText>
      <br />
      <EuiPanel paddingSize="l">
        <CountUntil fetchStreaming={plugins.bfetch.fetchStreaming} />
      </EuiPanel>
    </Page>
  );
};
