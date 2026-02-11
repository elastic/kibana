/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import useMount from 'react-use/lib/useMount';
import { redirectWhenMissing } from '@kbn/kibana-utils-plugin/public';
import React, { useMemo } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { BrandedLoadingIndicator } from './branded_loading_indicator';
import { useInternalStateSelector } from '../../state_management/redux';
import { DiscoverError } from '../../../../components/common/error_alert';

export const InitializationError = ({
  error: originalError,
}: {
  error: Error | SerializedError;
}) => {
  const error = useMemo(
    () => (originalError instanceof Error ? originalError : new Error(originalError.message)),
    [originalError]
  );

  if (error instanceof SavedObjectNotFound) {
    return <RedirectWhenSavedObjectNotFound error={error} />;
  }

  return <DiscoverError error={error} />;
};

const RedirectWhenSavedObjectNotFound = ({ error }: { error: SavedObjectNotFound }) => {
  const {
    application: { navigateToApp },
    core,
    history,
    http: { basePath },
    toastNotifications,
    urlTracker,
  } = useDiscoverServices();
  const discoverSessionId = useInternalStateSelector((state) => state.persistedDiscoverSession?.id);

  useMount(() => {
    const redirect = redirectWhenMissing({
      history,
      navigateToApp,
      basePath,
      mapping: {
        search: '/',
        'index-pattern': {
          app: 'management',
          path: `kibana/objects/search/${discoverSessionId}`,
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
