/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useMemo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
import type { UiSettingMetadata } from '@kbn/management-settings-types';
import { useSettingDefinitions } from '@kbn/management-settings-hooks';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import { useServices } from '../services';

const NO_SETTINGS: Record<string, UiSettingMetadata> = {};

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
  const {
    metadataClient,
    getAllowlistedSettings,
    subscribeToUpdates,
    getActiveSpace,
    subscribeToActiveSpace,
  } = useServices();
  const [solutionView, setSolutionView] = useState<SolutionView>();
  const [settingsVersion, setSettingsVersion] = useState(0);
  const { definitions, isLoading, loadError, retry } = useSettingDefinitions({
    metadataClient,
    scope,
    isEnabled,
  });

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
      return;
    }

    const subscription = subscribeToUpdates(() => {
      setSettingsVersion((version) => version + 1);
    }, scope);

    return () => {
      subscription.unsubscribe();
    };
  }, [scope, isEnabled, subscribeToUpdates]);

  const settings = useMemo(
    () => {
      if (isLoading || loadError) {
        return NO_SETTINGS;
      }
      return getAllowlistedSettings(scope, solutionView, definitions);
    },
    // The client is mutable, so `settingsVersion` stands in for its values changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope, solutionView, definitions, isLoading, loadError, getAllowlistedSettings, settingsVersion]
  );

  return { settings, isLoading, error: loadError, retry };
};
