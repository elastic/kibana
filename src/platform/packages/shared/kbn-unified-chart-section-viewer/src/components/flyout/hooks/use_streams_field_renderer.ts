/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import { useExternalServices } from '../../../context/external_services';

const STREAMS_FEATURE_ID = 'streams' as const;

/**
 * Returns the streams plugin's `renderFlyoutStreamFieldByStreamName` if the
 * feature is registered with the discoverShared registry; otherwise
 * `undefined`. The renderer produces a stream field/section to be embedded
 * inside the flyout (not the flyout itself).
 */
export const useStreamsFieldRenderer = ():
  | ObservabilityStreamsFeature['renderFlyoutStreamFieldByStreamName']
  | undefined => {
  const externalServices = useExternalServices();
  return externalServices?.discoverShared?.features.registry.getById(STREAMS_FEATURE_ID)
    ?.renderFlyoutStreamFieldByStreamName;
};
