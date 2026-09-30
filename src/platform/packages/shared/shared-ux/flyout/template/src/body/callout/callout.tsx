/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ParsedItem } from '@kbn/ui-react-assembly';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';
import type { FlyoutBodyCalloutLevel, FlyoutBodyCalloutProps } from '../../types';
import { partsOf } from '../../assembly';
import { calloutPart, CALLOUT_PART_NAME, type BodyCalloutDescriptor } from './part';

/** Declarative `FlyoutTemplate.Body.Callout`. */
export const Callout = calloutPart.createComponent<FlyoutBodyCalloutProps>({
  resolve: ({ id, ...calloutProps }) => calloutProps,
});

Callout.displayName = 'FlyoutTemplate.Body.Callout';

const CALLOUT_BY_LEVEL = {
  info: KbnInfoCallout,
  success: KbnSuccessCallout,
  warning: KbnWarningCallout,
  danger: KbnDangerCallout,
} satisfies Record<FlyoutBodyCalloutLevel, unknown>;

/**
 * Memoized so a body re-render, such as a tab switch, is absorbed by a shallow prop comparison
 * as long as the consumer's callout props are stable.
 */
const BannerCallout = memo(({ level, ...calloutProps }: BodyCalloutDescriptor) => {
  const LevelCallout = CALLOUT_BY_LEVEL[level];
  return <LevelCallout {...calloutProps} />;
});

BannerCallout.displayName = 'FlyoutTemplate.Body.BannerCallout';

/**
 * Renders every `Body.Callout` among the parsed body items as one stack, in source order, for
 * `EuiFlyoutBody`'s `banner`. Returns `undefined` when there are none, so no banner is rendered.
 */
export const renderCalloutBanner = (items: ParsedItem[]) => {
  const callouts = partsOf(items, CALLOUT_PART_NAME).flatMap((item) => {
    const callout = calloutPart.resolve(item, undefined);
    return callout
      ? [
          <EuiFlexItem key={item.instanceId} grow={false}>
            <BannerCallout {...callout} />
          </EuiFlexItem>,
        ]
      : [];
  });

  if (callouts.length === 0) return undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="flyoutBodyBanner">
      {callouts}
    </EuiFlexGroup>
  );
};
