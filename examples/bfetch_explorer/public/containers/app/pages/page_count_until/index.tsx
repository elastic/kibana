/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { CountUntil } from '../../../../components/count_until';
import { Page } from '../../../../components/page';
import { useDeps } from '../../../../hooks/use_deps';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
