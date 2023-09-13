/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { normalizeSettings } from '@kbn/management-settings-utilities';
import { SettingType, UiSettingMetadata } from '@kbn/management-settings-types';

/**
 * React hook which retrieves settings from a particular {@link IUiSettingsClient},
 * normalizes them to a predictable format, {@link UiSettingMetadata}, and returns
 * them as an observed collection.
 */
export const useSettings = (client: IUiSettingsClient) => {
  const [settings, setSettings] = useState<Record<string, UiSettingMetadata<SettingType>>>(
    normalizeSettings(client.getAll())
  );

  useEffectOnce(() => {
    const clientSubscription = client.getUpdate$().subscribe(() => {
      setSettings(normalizeSettings(client.getAll()));
    });

    return () => {
      clientSubscription.unsubscribe();
    };
  });

  return settings;
};
