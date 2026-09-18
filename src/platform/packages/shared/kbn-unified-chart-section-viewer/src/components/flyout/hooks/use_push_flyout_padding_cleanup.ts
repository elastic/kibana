/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

// Hardcoded to avoid a package dependency; mirrors APP_MAIN_SCROLL_CONTAINER_ID from
// `@kbn/ui-chrome-layout-constants` and the default EuiFlyout container configured in
// the Kibana EUI provider.
const APP_MAIN_SCROLL_CONTAINER_ID = 'app-main-scroll';

/**
 * Clears the inline push offset a push flyout can leave behind on Kibana's app scroll container.
 *
 * TODO: Remove once EUI ships the push-flyout padding fix (https://github.com/elastic/kibana/issues/276159).
 * When a push flyout mounts while another push flyout (e.g. the Inspector) is still cleaning up,
 * EUI captures and later restores a stale push offset onto the shared scroll container on unmount,
 * which shrinks the layout permanently. Clearing that inline padding neutralizes the stale value.
 */
export const usePushFlyoutPaddingCleanup = () => {
  useEffect(() => {
    return () => {
      document
        .getElementById(APP_MAIN_SCROLL_CONTAINER_ID)
        ?.style.removeProperty('padding-inline-end');
    };
  }, []);
};
