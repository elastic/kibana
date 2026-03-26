/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { isCCSRemoteIndexName } from '@kbn/es-query';
import type { ExternalServices } from '../../../types';

/**
 * Encapsulates Streams app navigation logic: permission gating, CCS filtering,
 * and URL generation via the Streams locator.
 *
 * Returns `getStreamUrl(name)` which yields a URL when the user can navigate
 * to the given stream, or `undefined` when the name is invalid (wildcard, CCS)
 * or the user lacks permissions.
 */
export const useStreamsNavigation = (externalServices?: ExternalServices) => {
  const canNavigate = useMemo(
    () => Boolean(externalServices?.discoverShared?.features.registry.getById('streams')),
    [externalServices?.discoverShared]
  );

  const locator = useMemo(
    () => externalServices?.share?.url.locators.get(STREAMS_APP_LOCATOR_ID),
    [externalServices?.share]
  );

  const getStreamUrl = useCallback(
    (name: string): string | undefined => {
      if (!canNavigate || !name || name.includes('*') || isCCSRemoteIndexName(name)) {
        return undefined;
      }
      return locator?.getRedirectUrl({ name });
    },
    [canNavigate, locator]
  );

  return { canNavigate, getStreamUrl };
};
