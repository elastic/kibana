/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
 * @param isEnabled When false, no settings are fetched, and the result is empty and not loading.
 * @returns An object with settings, a loading flag, the error if the settings failed to load, and
 * a function that fetches the settings again.
 */
export const useSettings = (scope: UiSettingsScope, isEnabled: boolean = true) => {
  const { getAllowlistedSettings, subscribeToUpdates, getActiveSpace, subscribeToActiveSpace } =
    useServices();
  const [solutionView, setSolutionView] = useState<SolutionView>();
  const [settings, setSettings] = useState<Record<string, UiSettingMetadata>>({});
  const [isLoading, setIsLoading] = useState(isEnabled);
  const [error, setError] = useState<Error>();
  const hasLoaded = useRef(false);
  const [attempt, setAttempt] = useState(0);

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
    if (!isEnabled) {
      hasLoaded.current = false;
      setSettings({});
      setError(undefined);
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    // Refetches keep the loaded settings on screen, so the form and its unsaved changes stay mounted.
    if (!hasLoaded.current) {
      setIsLoading(true);
    }

    const refreshSettings = () => {
      getAllowlistedSettings(scope, solutionView).then(
        (result) => {
          if (isCurrent) {
            hasLoaded.current = true;
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
  }, [scope, isEnabled, solutionView, getAllowlistedSettings, subscribeToUpdates, attempt]);

  const retry = useCallback(() => {
    // Loading is set in the same batch as the cleared error, or the empty state flashes before the spinner.
    if (!hasLoaded.current) {
      setIsLoading(true);
    }
    setError(undefined);
    setAttempt((current) => current + 1);
  }, []);

  return { settings, isLoading, error, retry };
};
