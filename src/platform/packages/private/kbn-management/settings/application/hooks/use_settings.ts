/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import { UiSettingsScope } from '@kbn/core-ui-settings-common';
import { useServices } from '../services';

/**
 * React hook which retrieves settings from a particular {@link IUiSettingsClient},
 * normalizes them to a predictable format, {@link UiSettingMetadata}, and returns
 * them as an observed collection.
 * @param scope The {@link UiSettingsScope} of the settings to be retrieved.
 * @returns An array of settings metadata objects.
 */
export const useSettings = (scope: UiSettingsScope) => {
  const { getAllowlistedSettings, subscribeToUpdates } = useServices();

  const [settings, setSettings] = useState(getAllowlistedSettings(scope));

  useEffectOnce(() => {
    const subscription = subscribeToUpdates(() => {
      setSettings(getAllowlistedSettings(scope));
    }, scope);

    return () => {
      subscription.unsubscribe();
    };
  });

  return settings;
};
