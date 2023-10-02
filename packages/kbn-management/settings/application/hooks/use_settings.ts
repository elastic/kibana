/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import { useServices } from '../services';

/**
 * React hook which retrieves settings from a particular {@link IUiSettingsClient},
 * normalizes them to a predictable format, {@link UiSettingMetadata}, and returns
 * them as an observed collection.
 */
export const useSettings = () => {
  const { getAllowlistedSettings, subscribeToUpdates } = useServices();

  const [settings, setSettings] = useState(getAllowlistedSettings());

  useEffectOnce(() => {
    const subscription = subscribeToUpdates(() => {
      setSettings(getAllowlistedSettings());
    });

    return () => {
      subscription.unsubscribe();
    };
  });

  return settings;
};
