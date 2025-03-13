/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

import useObservable from 'react-use/lib/useObservable';
import { defer } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { PLUGIN_NAME } from '../../common';

interface FeatureFlagsExampleAppDeps {
  http: CoreStart['http'];
}

export const SseExampleApp = ({ http }: FeatureFlagsExampleAppDeps) => {
  const sseResponse$ = useMemo(() => {
    return defer(() =>
      http.get('/internal/sse_examples/clock', {
        asResponse: true,
        rawResponse: true,
        version: '1',
      })
    ).pipe(httpResponseIntoObservable<{ message: string; type: 'clock' }>());
  }, [http]);

  const sseResponse = useObservable(sseResponse$, { message: 'Initial value', type: 'clock' });

  return (
    <>
      <EuiPageTemplate>
        <EuiPageTemplate.Header>
          <EuiTitle size="l">
            <h1>{PLUGIN_NAME}</h1>
          </EuiTitle>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <h2>{sseResponse.message}</h2>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
