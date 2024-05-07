/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '@kbn/presentation-publishing';

export type PublishesWritableSettings<SettingsType = boolean | undefined> =
  PublishesSettings<SettingsType> & {
    setSetting: (key: string, value: SettingsType) => void;
  };

export interface PublishesSettings<SettingsType = boolean | undefined> {
  settings: Record<string, PublishingSubject<SettingsType>>;
}

export const apiPublishesSettings = (
  unknownApi: null | unknown
): unknownApi is PublishesSettings => {
  return Boolean(unknownApi && typeof (unknownApi as PublishesSettings)?.settings === 'object');
};
