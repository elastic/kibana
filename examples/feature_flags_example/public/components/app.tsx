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
import {
  FeatureFlagsFullList,
  FeatureFlagsReactiveList,
  FeatureFlagsStaticList,
} from './feature_flags_list';

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
            <h3>Rendered separately</h3>
            <p>
              Each list are 2 different components, so only the reactive one is re-rendered when the
              feature flag is updated and the static one keeps the value until the next refresh.
            </p>
            <FeatureFlagsStaticList featureFlags={featureFlags} />
            <FeatureFlagsReactiveList featureFlags={featureFlags} />
            <EuiHorizontalRule />
            <h3>Rendered together</h3>
            <p>
              `useObservable` causes a full re-render of the component, updating the{' '}
              <i>statically</i> evaluated flags as well.
            </p>
            <FeatureFlagsFullList featureFlags={featureFlags} />
          </EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
