/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
import type { UiSettingMetadata } from '@kbn/management-settings-types';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import { useServices } from '../services';

/**
 * React hook which retrieves settings metadata from the server,
 * normalizes them to a predictable format, {@link UiSettingMetadata}, and returns
 * them as an observed collection.
 * @param scope The {@link UiSettingsScope} of the settings to be retrieved.
 * @returns An object with settings, a loading flag, and the error if the settings failed to load.
 */
export const useSettings = (scope: UiSettingsScope) => {
  const { getAllowlistedSettings, subscribeToUpdates, getActiveSpace, subscribeToActiveSpace } =
    useServices();
  const [solutionView, setSolutionView] = useState<SolutionView>();
  const [settings, setSettings] = useState<Record<string, UiSettingMetadata>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffectOnce(() => {
    const subscription = subscribeToActiveSpace(() => {
      getActiveSpace().then((space) => {
        const solution = space.solution ?? 'classic';
        setSolutionView(solution);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  });

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    const refreshSettings = () => {
      getAllowlistedSettings(scope, solutionView).then(
        (result) => {
          if (isCurrent) {
            setSettings(result);
            setError(undefined);
            setIsLoading(false);
          }
        },
        (e: Error) => {
          if (isCurrent) {
            setError(e);
            setIsLoading(false);
          }
        }
      );
    };

    refreshSettings();
    const subscription = subscribeToUpdates(refreshSettings, scope);

    return () => {
      isCurrent = false;
      subscription.unsubscribe();
    };
  }, [scope, solutionView, getAllowlistedSettings, subscribeToUpdates]);

  return { settings, isLoading, error };
};
