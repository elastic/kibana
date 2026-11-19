/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHorizontalRule, EuiPageTemplate, EuiTitle, EuiText, EuiLink } from '@elastic/eui';
import type { CoreStart, FeatureFlagsStart } from '@kbn/core/public';

import { PLUGIN_NAME } from '../../common';
import { FeatureFlagsHooksList, FeatureFlagsReactiveList } from './feature_flags_list';

interface FeatureFlagsExampleAppDeps {
  featureFlags: FeatureFlagsStart;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

export const FeatureFlagsExampleApp = ({ featureFlags }: FeatureFlagsExampleAppDeps) => {
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
            <h3>Rendered with observables</h3>
            <p>
              `getBooleanValue$`, `getStringValue$`, and `getNumberValue$` emit the current value,
              and again when the flag or the evaluation context changes.
            </p>
            <FeatureFlagsReactiveList featureFlags={featureFlags} />
            <EuiHorizontalRule />
            <h3>Rendered with the React hooks</h3>
            <p>
              `useBooleanValue`, `useStringValue`, and `useNumberValue` subscribe during render. The
              first render uses the synchronous evaluation, then the component updates when the flag
              or the evaluation context changes.
            </p>
            <FeatureFlagsHooksList featureFlags={featureFlags} />
          </EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
