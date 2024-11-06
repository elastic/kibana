/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import {
  FeatureFlagExampleBoolean,
  FeatureFlagExampleNumber,
  FeatureFlagExampleString,
} from '../../common/feature_flags';
import { PLUGIN_NAME } from '../../common';

interface FeatureFlagsExampleAppDeps {
  featureFlags: FeatureFlagsStart;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

export const FeatureFlagsExampleApp = ({ featureFlags }: FeatureFlagsExampleAppDeps) => {
  // Fetching the feature flags synchronously
  const bool = featureFlags.getBooleanValue(FeatureFlagExampleBoolean, false);
  const str = featureFlags.getStringValue(FeatureFlagExampleString, 'red');
  const num = featureFlags.getNumberValue(FeatureFlagExampleNumber, 1);

  // Use React Hooks to observe feature flags changes
  const bool$ = useObservable(featureFlags.getBooleanValue$(FeatureFlagExampleBoolean, false));
  const str$ = useObservable(featureFlags.getStringValue$(FeatureFlagExampleString, 'red'));
  const num$ = useObservable(featureFlags.getNumberValue$(FeatureFlagExampleNumber, 1));

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
                <EuiListGroupItem label={`${FeatureFlagExampleBoolean}: ${bool}`} />
                <EuiListGroupItem label={`${FeatureFlagExampleString}: ${str}`} />
                <EuiListGroupItem label={`${FeatureFlagExampleNumber}: ${num}`} />
              </p>
            </EuiListGroup>
            <EuiListGroup>
              <p>
                The <strong>observed</strong> feature flags are:
                <EuiListGroupItem label={`${FeatureFlagExampleBoolean}: ${bool$}`} />
                <EuiListGroupItem label={`${FeatureFlagExampleString}: ${str$}`} />
                <EuiListGroupItem label={`${FeatureFlagExampleNumber}: ${num$}`} />
              </p>
            </EuiListGroup>
          </EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
