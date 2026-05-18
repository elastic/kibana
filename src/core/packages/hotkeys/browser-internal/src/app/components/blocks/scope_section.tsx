/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import type {
  HotkeyDefinition,
  HotkeysSidebarActions,
  DiscoveryOnlyHotkeyDefinition,
} from '@kbn/core-hotkeys-browser';
import { HotkeyRow } from './hotkey_row';

type HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition =
  | HotkeyDefinition
  | DiscoveryOnlyHotkeyDefinition;

interface FeatureBucket {
  readonly featureId: string;
  readonly defs: readonly HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[];
}

/** Cosmetic display only — featureIds are registrant-supplied namespaces. */
const formatFeatureTitle = (featureId: string): string => featureId.replace(/:/g, ' › ');

/** Subsection heading for a bucket keyed by {@link HotkeyDefinition.featureId}. */
const getBucketTitle = (
  featureId: string,
  defs: readonly HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[]
): string => {
  if (defs.length === 0) {
    return formatFeatureTitle(featureId);
  }
  const firstGroup = defs[0].group;
  if (firstGroup !== undefined && firstGroup !== '' && defs.every((d) => d.group === firstGroup)) {
    return firstGroup;
  }
  return formatFeatureTitle(featureId);
};

const partitionIntoFeatureBuckets = (
  entries: readonly HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[]
): {
  readonly buckets: readonly FeatureBucket[];
  readonly noFeature: HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[];
} => {
  const byFeature = new Map<string, HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[]>();
  const noFeature: HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[] = [];
  for (const def of entries) {
    if (def.featureId) {
      const list = byFeature.get(def.featureId);
      if (list) {
        list.push(def);
      } else {
        byFeature.set(def.featureId, [def]);
      }
    } else {
      noFeature.push(def);
    }
  }
  const buckets: FeatureBucket[] = [...byFeature.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([featureId, defs]) => ({ featureId, defs }));
  return { buckets, noFeature };
};

const HotkeyRows = ({
  defs,
  actions,
}: {
  defs: readonly HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[];
  actions: HotkeysSidebarActions;
}) => (
  <>
    {defs.map((def) => (
      <React.Fragment key={def.id}>
        <HotkeyRow def={def} actions={actions} />
        <EuiSpacer size="s" />
      </React.Fragment>
    ))}
  </>
);

export const ScopeSection = ({
  title,
  entries,
  actions,
}: {
  title: string;
  entries: readonly HotkeyDefinitionOrDiscoveryOnlyHotkeyDefinition[];
  actions: HotkeysSidebarActions;
}) => {
  if (entries.length === 0) {
    return null;
  }
  const { buckets, noFeature } = partitionIntoFeatureBuckets(entries);
  const hasFeatureBuckets = buckets.length > 0;
  const hasNoFeatureTail = noFeature.length > 0;

  return (
    <>
      <EuiTitle size="xs">
        <p>{title}</p>
      </EuiTitle>
      <EuiHorizontalRule margin="xs" />
      {hasFeatureBuckets
        ? buckets.map(({ featureId, defs }) => (
            <React.Fragment key={featureId}>
              <EuiTitle size="xxs">
                <p>{getBucketTitle(featureId, defs)}</p>
              </EuiTitle>
              <EuiSpacer size="s" />
              <HotkeyRows defs={defs} actions={actions} />
              <EuiSpacer size="s" />
            </React.Fragment>
          ))
        : null}
      {hasFeatureBuckets && hasNoFeatureTail ? (
        <>
          <EuiHorizontalRule margin="m" />
          <HotkeyRows defs={noFeature} actions={actions} />
        </>
      ) : (
        <HotkeyRows defs={noFeature} actions={actions} />
      )}
      <EuiSpacer size="m" />
    </>
  );
};
