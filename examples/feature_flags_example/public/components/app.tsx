/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiHorizontalRule,
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import type { CoreStart, FeatureFlagsStart } from '@kbn/core/public';

import useObservable from 'react-use/lib/useObservable';
import { PLUGIN_NAME } from '../../common';

interface FeatureFlagsExampleAppDeps {
  featureFlags: FeatureFlagsStart;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

export const FeatureFlagsExampleApp = ({ featureFlags }: FeatureFlagsExampleAppDeps) => {
  // Fetching the feature flags synchronously
  const bool = featureFlags.getBooleanValue('example-boolean', false);
  const str = featureFlags.getStringValue('example-string', 'red');
  const num = featureFlags.getNumberValue('example-number', 1);

  // Use React Hooks to observe feature flags changes
  const bool$ = useObservable(featureFlags.getBooleanValue$('example-boolean', false));
  const str$ = useObservable(featureFlags.getStringValue$('example-string', 'red'));
  const num$ = useObservable(featureFlags.getNumberValue$('example-number', 1));

  return (
    <>
      <EuiPageTemplate>
        <EuiPageTemplate.Header>
          <EuiTitle size="l">
            <h1>{PLUGIN_NAME}</h1>
          </EuiTitle>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <EuiTitle>
            <h2>Demo of the feature flags service</h2>
          </EuiTitle>
          <EuiText>
            <p>
              To learn more, refer to{' '}
              <EuiLink
                href={'https://docs.elastic.dev/kibana-dev-docs/tutorials/feature-flags-service'}
              >
                the docs
              </EuiLink>
              .
            </p>
            <EuiHorizontalRule />
            <EuiListGroup>
              <p>
                The feature flags are:
                <EuiListGroupItem label={`example-boolean: ${bool}`} />
                <EuiListGroupItem label={`example-string: ${str}`} />
                <EuiListGroupItem label={`example-number: ${num}`} />
              </p>
            </EuiListGroup>
            <EuiListGroup>
              <p>
                The <strong>observed</strong> feature flags are:
                <EuiListGroupItem label={`example-boolean: ${bool$}`} />
                <EuiListGroupItem label={`example-string: ${str$}`} />
                <EuiListGroupItem label={`example-number: ${num$}`} />
              </p>
            </EuiListGroup>
          </EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
