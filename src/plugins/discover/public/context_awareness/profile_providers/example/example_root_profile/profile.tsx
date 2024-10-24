/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { getFieldValue } from '@kbn/discover-utils';
import React, { useState } from 'react';
import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ExampleContextProvider } from '../example_context';

export const createExampleRootProfileProvider = (): RootProfileProvider => ({
  profileId: 'example-root-profile',
  isExperimental: true,
  profile: {
    getRenderAppWrapper,
    getCellRenderers: (prev) => (params) => ({
      ...prev(params),
      '@timestamp': (props) => {
        const timestamp = getFieldValue(props.row, '@timestamp') as string;

        return (
          <EuiBadge color="hollow" title={timestamp} data-test-subj="exampleRootProfileTimestamp">
            {timestamp}
          </EuiBadge>
        );
      },
    }),
  },
  resolve: (params) => {
    if (params.solutionNavId != null) {
      return { isMatch: false };
    }

    return { isMatch: true, context: { solutionType: SolutionType.Default } };
  },
});

export const createExampleFallbackRootProfileProvider = (): RootProfileProvider => ({
  profileId: 'example-fallback-root-profile',
  isExperimental: true,
  profile: { getRenderAppWrapper },
  resolve: (params) => ({
    isMatch: true,
    context: { solutionType: params.solutionNavId as SolutionType },
  }),
});

const getRenderAppWrapper: RootProfileProvider['profile']['getRenderAppWrapper'] =
  (PrevWrapper) =>
  ({ children }) => {
    const [currentMessage, setCurrentMessage] = useState<string | undefined>(undefined);

    return (
      <PrevWrapper>
        <ExampleContextProvider value={{ currentMessage, setCurrentMessage }}>
          {children}
          {currentMessage && (
            <EuiFlyout
              type="push"
              maxWidth={500}
              onClose={() => setCurrentMessage(undefined)}
              data-test-subj="exampleRootProfileFlyout"
            >
              <EuiFlyoutHeader hasBorder>
                <EuiTitle size="m">
                  <h2>Inspect message</h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                <EuiCodeBlock isCopyable data-test-subj="exampleRootProfileCurrentMessage">
                  {currentMessage}
                </EuiCodeBlock>
              </EuiFlyoutBody>
            </EuiFlyout>
          )}
        </ExampleContextProvider>
      </PrevWrapper>
    );
  };
