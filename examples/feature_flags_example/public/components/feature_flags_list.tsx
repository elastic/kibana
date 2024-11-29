/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import React from 'react';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import useObservable from 'react-use/lib/useObservable';
import {
  FeatureFlagExampleBoolean,
  FeatureFlagExampleNumber,
  FeatureFlagExampleString,
} from '../../common/feature_flags';

export interface FeatureFlagsListProps {
  featureFlags: FeatureFlagsStart;
}

export const FeatureFlagsStaticList = ({ featureFlags }: FeatureFlagsListProps) => {
  // Fetching the feature flags synchronously
  const bool = featureFlags.getBooleanValue(FeatureFlagExampleBoolean, false);
  const str = featureFlags.getStringValue(FeatureFlagExampleString, 'red');
  const num = featureFlags.getNumberValue(FeatureFlagExampleNumber, 1);

  return (
    <EuiListGroup>
      <p>
        The feature flags are:
        <EuiListGroupItem label={`${FeatureFlagExampleBoolean}: ${bool}`} />
        <EuiListGroupItem label={`${FeatureFlagExampleString}: ${str}`} />
        <EuiListGroupItem label={`${FeatureFlagExampleNumber}: ${num}`} />
      </p>
    </EuiListGroup>
  );
};

export const FeatureFlagsReactiveList = ({ featureFlags }: FeatureFlagsListProps) => {
  // Use React Hooks to observe feature flags changes
  const bool$ = useObservable(featureFlags.getBooleanValue$(FeatureFlagExampleBoolean, false));
  const str$ = useObservable(featureFlags.getStringValue$(FeatureFlagExampleString, 'red'));
  const num$ = useObservable(featureFlags.getNumberValue$(FeatureFlagExampleNumber, 1));

  return (
    <EuiListGroup>
      <p>
        The <strong>observed</strong> feature flags are:
        <EuiListGroupItem label={`${FeatureFlagExampleBoolean}: ${bool$}`} />
        <EuiListGroupItem label={`${FeatureFlagExampleString}: ${str$}`} />
        <EuiListGroupItem label={`${FeatureFlagExampleNumber}: ${num$}`} />
      </p>
    </EuiListGroup>
  );
};

export const FeatureFlagsFullList = ({ featureFlags }: FeatureFlagsListProps) => {
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
    </>
  );
};
