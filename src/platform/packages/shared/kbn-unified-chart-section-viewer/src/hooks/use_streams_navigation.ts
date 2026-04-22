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
import { isNonLocalIndexName } from '@kbn/es-query';
import type { ExternalServices } from '../types';

export interface UseStreamsNavigationResult {
  getStreamUrl: (name: string) => string | undefined;
}

/**
 * Encapsulates Streams app navigation logic: permission gating, CCS filtering,
 * wildcard rejection, and URL generation via the Streams locator.
 *
 * `getStreamUrl(name)` returns a URL when the given name is navigable in the
 * Streams app, or `undefined` when the name is invalid (empty, wildcard, CCS)
 * or the user lacks permissions / the locator is unavailable.
 */
export const useStreamsNavigation = (
  externalServices?: ExternalServices
): UseStreamsNavigationResult => {
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
      if (
        // Streams feature not registered or locator unavailable in the host app.
        !canNavigate ||
        // Defensive: empty / falsy names cannot produce a valid Streams URL.
        !name ||
        // Streams locator routes to a single concrete stream (`/{name}`),
        // so index-pattern wildcards like `metrics-*` are not navigable.
        name.includes('*') ||
        // Product decision (see https://github.com/elastic/kibana/issues/239387):
        // suppress the link when the data stream is non-local (remote cluster
        // via CCS, or linked project via CPS) because the URL would target the
        // local cluster/project and not the remote one.
        isNonLocalIndexName(name)
      ) {
        return undefined;
      }
      return locator?.getRedirectUrl({ name });
    },
    [canNavigate, locator]
  );

  return { getStreamUrl };
};
