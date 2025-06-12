/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import useMount from 'react-use/lib/useMount';
import { redirectWhenMissing } from '@kbn/kibana-utils-plugin/public';
import React from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { BrandedLoadingIndicator } from './branded_loading_indicator';

export const RedirectWhenSavedObjectNotFound = ({
  error,
  discoverSessionId,
}: {
  error: SavedObjectNotFound;
  discoverSessionId: string | undefined;
}) => {
  const {
    application: { navigateToApp },
    core,
    history,
    http: { basePath },
    toastNotifications,
    urlTracker,
  } = useDiscoverServices();

  useMount(() => {
    const redirect = redirectWhenMissing({
      history,
      navigateToApp,
      basePath,
      mapping: {
        search: '/',
        'index-pattern': {
          app: 'management',
          path: `kibana/objects/savedSearches/${discoverSessionId}`,
        },
      },
      toastNotifications,
      onBeforeRedirect() {
        urlTracker.setTrackedUrl('/');
      },
      ...core,
    });

    redirect(error);
  });

  return <BrandedLoadingIndicator />;
};
